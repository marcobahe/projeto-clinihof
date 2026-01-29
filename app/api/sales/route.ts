import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/sales - List all sales for workspace
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspace = await getUserWorkspace((session.user as any).id);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    const sales = await prisma.sale.findMany({
      where: { workspaceId: workspace.id },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        items: {
          include: {
            procedure: true,
          },
        },
        sessions: {
          include: {
            procedure: true,
          },
          orderBy: { scheduledDate: 'asc' },
        },
        paymentSplits: {
          include: {
            installmentDetails: {
              orderBy: { installmentNumber: 'asc' },
            },
          },
        },
      },
      orderBy: { saleDate: 'desc' },
    });

    // Calculate completed sessions for each sale from already loaded data
    const salesWithCompletedCount = sales.map((sale) => {
      const completedSessions = sale.sessions.filter(
        (session) => session.status === 'COMPLETED'
      ).length;
      const totalSessions = sale.sessions.length;
      
      return {
        ...sale,
        completedSessions,
        _count: {
          sessions: totalSessions,
        },
      };
    });

    return NextResponse.json(salesWithCompletedCount);
  } catch (error) {
    console.error('Error fetching sales:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sales' },
      { status: 500 }
    );
  }
}

// POST /api/sales - Create new sale with payment splits
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspace = await getUserWorkspace((session.user as any).id);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      patientId,
      saleDate,
      totalAmount,
      paymentMethod, // deprecated - mantido para compatibilidade
      installments, // deprecated
      paymentStatus,
      notes,
      items,
      paymentSplits, // novo formato: array de splits
      sessionDates, // array de datas para cada sessão
    } = body;

    // Validate required fields
    if (!patientId || !totalAmount || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate payment splits if provided
    if (paymentSplits && paymentSplits.length > 0) {
      // Validar que a soma dos splits = totalAmount
      const splitsTotal = paymentSplits.reduce(
        (sum: number, split: any) => sum + parseFloat(split.amount),
        0
      );
      
      if (Math.abs(splitsTotal - parseFloat(totalAmount)) > 0.01) {
        return NextResponse.json(
          { error: `A soma dos pagamentos (R$ ${splitsTotal.toFixed(2)}) deve ser igual ao total da venda (R$ ${parseFloat(totalAmount).toFixed(2)})` },
          { status: 400 }
        );
      }

      // Validar que cada split tem datas de recebimento para todas as parcelas
      for (const split of paymentSplits) {
        if (!split.installmentDetails || split.installmentDetails.length !== split.installments) {
          return NextResponse.json(
            { error: 'Cada forma de pagamento deve ter todas as datas de recebimento informadas' },
            { status: 400 }
          );
        }
      }
    } else if (!paymentMethod) {
      // Se não tem splits nem método antigo, erro
      return NextResponse.json(
        { error: 'É necessário informar a forma de pagamento' },
        { status: 400 }
      );
    }

    // Create sale with items and sessions
    const sale = await prisma.sale.create({
      data: {
        workspaceId: workspace.id,
        patientId,
        saleDate: saleDate ? new Date(saleDate) : new Date(),
        totalAmount: parseFloat(totalAmount),
        paymentMethod: paymentMethod || null, // deprecated
        installments: installments || 1, // deprecated
        paymentStatus: paymentStatus || 'PENDING',
        notes,
        items: {
          create: items.map((item: any) => ({
            procedureId: item.procedureId,
            quantity: parseInt(item.quantity),
            unitPrice: parseFloat(item.unitPrice),
          })),
        },
      },
      include: {
        items: true,
      },
    });

    // Create payment splits if provided
    if (paymentSplits && paymentSplits.length > 0) {
      for (const split of paymentSplits) {
        const paymentSplit = await prisma.paymentSplit.create({
          data: {
            saleId: sale.id,
            paymentMethod: split.paymentMethod,
            amount: parseFloat(split.amount),
            installments: parseInt(split.installments) || 1,
          },
        });

        // Calculate card fees and receiving dates if it's a card payment
        let installmentDetailsData;
        
        if (split.paymentMethod === 'CREDIT_CARD' || split.paymentMethod === 'DEBIT_CARD') {
          // Find the applicable card fee rule by exact installment count
          const cardFeeRule = await prisma.cardFeeRule.findFirst({
            where: {
              workspaceId: workspace.id,
              isActive: true,
              installmentCount: parseInt(split.installments) || 1,
            },
            include: {
              workspace: {
                include: {
                  costs: {
                    where: {
                      category: 'CARD',
                      isActive: true,
                    },
                  },
                },
              },
            },
          });

          // Get the card cost for receiving days
          const cardCost = await prisma.cost.findFirst({
            where: {
              workspaceId: workspace.id,
              category: 'CARD',
              isActive: true,
              ...(cardFeeRule?.costId ? { id: cardFeeRule.costId } : {}),
            },
          });

          const feePercentage = cardFeeRule?.feePercentage || 0;
          const receivingDays = cardCost?.receivingDays || 30;
          const splitAmount = parseFloat(split.amount);
          const numInstallments = parseInt(split.installments) || 1;

          installmentDetailsData = split.installmentDetails.map((detail: any, index: number) => {
            // Calculate net amount after fees
            const grossAmount = parseFloat(detail.amount);
            const feeAmount = grossAmount * (feePercentage / 100);
            const netAmount = grossAmount - feeAmount;

            // Calculate receiving date
            // First installment: saleDate + receivingDays
            // Subsequent installments: saleDate + receivingDays + (30 * installmentNumber)
            const baseDate = saleDate ? new Date(saleDate) : new Date();
            const daysToAdd = receivingDays + (index * 30);
            const receivingDate = new Date(baseDate);
            receivingDate.setDate(receivingDate.getDate() + daysToAdd);

            return {
              paymentSplitId: paymentSplit.id,
              installmentNumber: index + 1,
              amount: netAmount, // Valor líquido após taxa
              dueDate: detail.dueDate ? new Date(detail.dueDate) : receivingDate,
              status: detail.status || 'PENDING',
              notes: feePercentage > 0 
                ? `Taxa de ${feePercentage.toFixed(2)}% aplicada. Valor bruto: R$ ${grossAmount.toFixed(2)}` 
                : detail.notes || null,
            };
          });
        } else {
          // For cash/pix/bank slip, use the original values
          installmentDetailsData = split.installmentDetails.map((detail: any, index: number) => ({
            paymentSplitId: paymentSplit.id,
            installmentNumber: index + 1,
            amount: parseFloat(detail.amount),
            dueDate: detail.dueDate ? new Date(detail.dueDate) : null,
            status: detail.status || 'PENDING',
            notes: detail.notes || null,
          }));
        }

        await prisma.paymentInstallment.createMany({
          data: installmentDetailsData,
        });
      }
    }

    // Create pending sessions for each item with scheduled dates
    let sessionIndex = 0;
    for (const item of sale.items) {
      const sessions = Array.from({ length: item.quantity }, (_, i) => {
        const currentSessionIndex = sessionIndex + i;
        const scheduledDate = sessionDates && sessionDates[currentSessionIndex] 
          ? new Date(sessionDates[currentSessionIndex]) 
          : null;
        
        return {
          saleId: sale.id,
          procedureId: item.procedureId,
          status: 'PENDING' as const,
          scheduledDate: scheduledDate,
        };
      });

      await prisma.procedureSession.createMany({
        data: sessions,
      });
      
      sessionIndex += item.quantity;
    }

    // Fetch complete sale with payment splits
    const completeSale = await prisma.sale.findUnique({
      where: { id: sale.id },
      include: {
        items: {
          include: {
            procedure: true,
          },
        },
        paymentSplits: {
          include: {
            installmentDetails: {
              orderBy: { installmentNumber: 'asc' },
            },
          },
        },
        patient: true,
      },
    });

    return NextResponse.json(completeSale, { status: 201 });
  } catch (error) {
    console.error('Error creating sale:', error);
    return NextResponse.json(
      { error: 'Failed to create sale' },
      { status: 500 }
    );
  }
}
