import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getUserWorkspace } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

/**
 * POST /api/quotes/[id]/convert
 * Convert a quote to a sale
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    if (!userId) {
      return NextResponse.json({ error: 'ID do usuário não encontrado' }, { status: 400 });
    }

    const workspace = await getUserWorkspace(userId);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
    }

    const { id } = params;
    const body = await req.json();
    const { paymentSplits, saleDate, notes } = body;

    // Get the quote with items
    const quote = await prisma.quote.findFirst({
      where: {
        id,
        workspaceId: workspace.id
      },
      include: {
        items: {
          include: {
            procedure: true
          }
        }
      }
    });

    if (!quote) {
      return NextResponse.json(
        { error: 'Orçamento não encontrado' },
        { status: 404 }
      );
    }

    // Check if already converted
    if (quote.status === 'ACCEPTED' && quote.saleId) {
      return NextResponse.json(
        { error: 'Orçamento já foi convertido em venda' },
        { status: 400 }
      );
    }

    // Validate payment splits
    if (!paymentSplits || paymentSplits.length === 0) {
      return NextResponse.json(
        { error: 'Formas de pagamento são obrigatórias' },
        { status: 400 }
      );
    }

    // Validate total amount matches
    const totalSplitAmount = paymentSplits.reduce((sum: number, split: any) => sum + split.amount, 0);
    if (Math.abs(totalSplitAmount - quote.finalAmount) > 0.01) {
      return NextResponse.json(
        { error: `Total dos pagamentos (R$ ${totalSplitAmount.toFixed(2)}) não corresponde ao valor final (R$ ${quote.finalAmount.toFixed(2)})` },
        { status: 400 }
      );
    }

    // Create the sale with a transaction
    const sale = await prisma.$transaction(async (tx) => {
      // Create sale
      const newSale = await tx.sale.create({
        data: {
          workspaceId: workspace.id,
          patientId: quote.patientId,
          saleDate: saleDate ? new Date(saleDate) : new Date(),
          totalAmount: quote.finalAmount,
          paymentStatus: 'PENDING',
          notes: notes || quote.notes || `Convertido do orçamento: ${quote.title}`
        }
      });

      // Create sale items from quote items
      const saleItemsData = quote.items
        .filter(item => item.procedureId) // Only items with valid procedure
        .map(item => ({
          saleId: newSale.id,
          procedureId: item.procedureId!,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        }));

      if (saleItemsData.length > 0) {
        await tx.saleItem.createMany({
          data: saleItemsData
        });
      }

      // Create payment splits
      for (const split of paymentSplits) {
        const paymentSplit = await tx.paymentSplit.create({
          data: {
            saleId: newSale.id,
            paymentMethod: split.paymentMethod,
            amount: split.amount,
            installments: split.installments || 1
          }
        });

        // Create installments for this split
        const installmentAmount = split.amount / (split.installments || 1);
        
        for (let i = 1; i <= (split.installments || 1); i++) {
          const dueDate = new Date(saleDate || new Date());
          dueDate.setMonth(dueDate.getMonth() + (i - 1));
          
          await tx.paymentInstallment.create({
            data: {
              paymentSplitId: paymentSplit.id,
              installmentNumber: i,
              amount: installmentAmount,
              dueDate,
              status: 'PENDING'
            }
          });
        }
      }

      // Create procedure sessions
      for (const item of quote.items) {
        if (!item.procedureId) continue;

        for (let i = 0; i < item.quantity; i++) {
          await tx.procedureSession.create({
            data: {
              saleId: newSale.id,
              procedureId: item.procedureId,
              status: 'PENDING'
            }
          });
        }
      }

      return newSale;
    });

    // Update quote status
    await prisma.quote.update({
      where: { id },
      data: {
        status: 'ACCEPTED',
        acceptedDate: new Date(),
        saleId: sale.id
      }
    });

    // Return the created sale with full details
    const fullSale = await prisma.sale.findUnique({
      where: { id: sale.id },
      include: {
        patient: true,
        items: {
          include: {
            procedure: true
          }
        },
        paymentSplits: {
          include: {
            installmentDetails: true
          }
        },
        sessions: true
      }
    });

    return NextResponse.json({
      message: 'Orçamento convertido em venda com sucesso',
      sale: fullSale
    }, { status: 201 });
  } catch (error) {
    console.error('Error converting quote to sale:', error);
    return NextResponse.json(
      { error: 'Erro ao converter orçamento em venda' },
      { status: 500 }
    );
  }
}
