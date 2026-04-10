import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getUserWorkspace } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

/**
 * POST /api/quotes/[id]/convert-partial
 * Fechar parcialmente orçamento — converter apenas itens selecionados
 * Os itens não selecionados permanecem no orçamento (que volta pra PENDING)
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
    const { selectedItemIds, paymentSplits, saleDate, notes } = body;

    if (!selectedItemIds || selectedItemIds.length === 0) {
      return NextResponse.json({ error: 'Selecione pelo menos um item' }, { status: 400 });
    }

    if (!paymentSplits || paymentSplits.length === 0) {
      return NextResponse.json({ error: 'Formas de pagamento são obrigatórias' }, { status: 400 });
    }

    // Buscar orçamento completo
    const quote = await prisma.quote.findFirst({
      where: { id, workspaceId: workspace.id },
      include: {
        items: {
          include: {
            procedure: true,
            package: { include: { items: { include: { procedure: true } } } }
          }
        }
      }
    });

    if (!quote) {
      return NextResponse.json({ error: 'Orçamento não encontrado' }, { status: 404 });
    }

    if (quote.status === 'ACCEPTED' && quote.saleId) {
      return NextResponse.json({ error: 'Orçamento já foi convertido em venda' }, { status: 400 });
    }

    // Separar itens selecionados dos que ficam
    const selectedItems = quote.items.filter(item => selectedItemIds.includes(item.id));
    const remainingItems = quote.items.filter(item => !selectedItemIds.includes(item.id));

    if (selectedItems.length === 0) {
      return NextResponse.json({ error: 'Nenhum item válido selecionado' }, { status: 400 });
    }

    // Calcular total dos itens selecionados (proporcional)
    const selectedTotal = selectedItems.reduce((sum, item) => sum + item.totalPrice, 0);

    // Validar pagamento
    const totalSplitAmount = paymentSplits.reduce((sum: number, split: any) => sum + split.amount, 0);
    if (Math.abs(totalSplitAmount - selectedTotal) > 0.01) {
      return NextResponse.json(
        { error: `Total dos pagamentos (R$ ${totalSplitAmount.toFixed(2)}) não corresponde ao valor selecionado (R$ ${selectedTotal.toFixed(2)})` },
        { status: 400 }
      );
    }

    // Transação: criar venda + atualizar orçamento
    const result = await prisma.$transaction(async (tx) => {
      // Criar venda
      const sale = await tx.sale.create({
        data: {
          workspaceId: workspace.id,
          patientId: quote.patientId,
          saleDate: saleDate ? new Date(saleDate) : new Date(),
          totalAmount: selectedTotal,
          paymentStatus: 'PENDING',
          notes: notes || `Fechamento parcial do orçamento: ${quote.title}`
        }
      });

      // Criar sale items e sessões
      for (const item of selectedItems) {
        if (item.procedureId) {
          await tx.saleItem.create({
            data: {
              saleId: sale.id,
              procedureId: item.procedureId,
              quantity: item.quantity,
              unitPrice: item.unitPrice
            }
          });

          for (let i = 0; i < item.quantity; i++) {
            await tx.procedureSession.create({
              data: {
                saleId: sale.id,
                procedureId: item.procedureId,
                status: 'PENDING'
              }
            });
          }
        }
      }

      // Criar pagamentos e parcelas
      for (const split of paymentSplits) {
        const paymentSplit = await tx.paymentSplit.create({
          data: {
            saleId: sale.id,
            paymentMethod: split.paymentMethod,
            amount: split.amount,
            installments: split.installments || 1
          }
        });

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

      // Se sobraram itens, remover só os selecionados e recalcular
      if (remainingItems.length > 0) {
        await tx.quoteItem.deleteMany({
          where: { id: { in: selectedItemIds } }
        });

        const newTotal = remainingItems.reduce((sum, item) => sum + item.totalPrice, 0);
        const newDiscountPercent = quote.totalAmount > 0 ? (quote.discountPercent * newTotal / quote.totalAmount) : 0;
        const newDiscountAmount = newTotal * newDiscountPercent / 100;
        const newFinalAmount = newTotal - newDiscountAmount;

        await tx.quote.update({
          where: { id },
          data: {
            totalAmount: newTotal,
            discountPercent: newDiscountPercent,
            discountAmount: newDiscountAmount,
            finalAmount: newFinalAmount,
            status: 'PENDING'
          }
        });
      } else {
        // Todos os itens convertidos — marcar como aceito
        await tx.quote.update({
          where: { id },
          data: {
            status: 'ACCEPTED',
            acceptedDate: new Date(),
            saleId: sale.id
          }
        });
      }

      return sale;
    });

    const fullSale = await prisma.sale.findUnique({
      where: { id: result.id },
      include: {
        patient: true,
        items: { include: { procedure: true } },
        paymentSplits: { include: { installmentDetails: true } }
      }
    });

    return NextResponse.json({
      message: remainingItems.length > 0 
        ? 'Fechamento parcial realizado. Itens restantes permanecem no orçamento.' 
        : 'Orçamento convertido em venda com sucesso!',
      sale: fullSale
    }, { status: 201 });
  } catch (error) {
    console.error('Error in partial conversion:', error);
    return NextResponse.json({ error: 'Erro no fechamento parcial' }, { status: 500 });
  }
}
