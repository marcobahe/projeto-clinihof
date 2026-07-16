import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/db';
import { syncSessionToGoogleCalendar } from '@/lib/google-calendar';

export const dynamic = 'force-dynamic';

// GET /api/sales/[id] - Get sale details with sessions
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspace = await getUserWorkspace((session.user as any).id);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    const sale = await prisma.sale.findFirst({
      where: {
        id: params.id,
        workspaceId: workspace.id,
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        items: {
          include: {
            procedure: true,
          },
        },
        sessions: {
          include: {
            procedure: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
          orderBy: [
            { status: 'asc' }, // COMPLETED comes before PENDING alphabetically reversed
            { completedDate: 'desc' },
            { createdAt: 'asc' },
          ],
        },
        _count: {
          select: {
            sessions: true,
          },
        },
      },
    });

    if (!sale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    // Calculate completed sessions count
    const completedSessions = sale.sessions.filter(s => s.status === 'COMPLETED').length;

    return NextResponse.json({
      ...sale,
      completedSessions,
    });
  } catch (error) {
    console.error('Error fetching sale:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sale' },
      { status: 500 }
    );
  }
}

// DELETE /api/sales/[id] - Delete a sale and remove it from financial metrics
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const workspace = await getUserWorkspace((session.user as any).id);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
    }

    const existingSale = await prisma.sale.findFirst({
      where: { id: params.id, workspaceId: workspace.id },
      include: {
        sessions: true,
        paymentSplits: true,
        items: true,
      },
    });

    if (!existingSale) {
      return NextResponse.json({ error: 'Venda não encontrada' }, { status: 404 });
    }

    const linkedQuote = await prisma.quote.findFirst({
      where: {
        workspaceId: workspace.id,
        saleId: params.id,
      },
      select: {
        id: true,
        sentDate: true,
      },
    });

    // Best effort: remove Google Calendar events before deleting the local sessions.
    const sessionsWithGoogleEvent = existingSale.sessions.filter(s => s.googleEventId);
    const userId = (session.user as any).id;
    if (sessionsWithGoogleEvent.length > 0) {
      const syncResults = await Promise.allSettled(
        sessionsWithGoogleEvent.map(sess => syncSessionToGoogleCalendar(userId, sess.id, 'delete'))
      );

      syncResults.forEach((result) => {
        if (result.status === 'rejected') {
          console.error('[GoogleCalendar] Sync error (sale delete):', result.reason);
        }
      });
    }

    await prisma.$transaction(async (tx) => {
      const splits = await tx.paymentSplit.findMany({ where: { saleId: params.id } });
      for (const split of splits) {
        await tx.paymentInstallment.deleteMany({ where: { paymentSplitId: split.id } });
      }

      if (linkedQuote) {
        await tx.quote.update({
          where: { id: linkedQuote.id },
          data: {
            status: linkedQuote.sentDate ? 'SENT' : 'PENDING',
            acceptedDate: null,
            saleId: null,
          },
        });
      }

      await tx.paymentSplit.deleteMany({ where: { saleId: params.id } });
      await tx.procedureSession.deleteMany({ where: { saleId: params.id } });
      await tx.saleItem.deleteMany({ where: { saleId: params.id } });
      await tx.sale.delete({ where: { id: params.id } });
    });

    return NextResponse.json({
      message: 'Venda excluída com sucesso',
      deleted: {
        sale: 1,
        sessions: existingSale.sessions.length,
        paymentSplits: existingSale.paymentSplits.length,
        items: existingSale.items.length,
        linkedQuoteReset: Boolean(linkedQuote),
      },
    });
  } catch (error) {
    console.error('Error deleting sale:', error);
    return NextResponse.json({ error: 'Erro ao excluir venda' }, { status: 500 });
  }
}

// PUT /api/sales/[id] - Editar venda
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const workspace = await getUserWorkspace((session.user as any).id);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
    }

    const existingSale = await prisma.sale.findFirst({
      where: { id: params.id, workspaceId: workspace.id }
    });

    if (!existingSale) {
      return NextResponse.json({ error: 'Venda não encontrada' }, { status: 404 });
    }

    const body = await request.json();
    const { notes, discountPercent, discountAmount, cardFeePercent, taxRate, sellerId } = body;

    const updateData: any = {};
    if (notes !== undefined) updateData.notes = notes;
    if (sellerId !== undefined) updateData.sellerId = sellerId || null;

    // Recalcular financeiro
    if (discountPercent !== undefined || discountAmount !== undefined || cardFeePercent !== undefined || taxRate !== undefined) {
      const currentTotal = existingSale.totalAmount;
      let finalAmount = existingSale.finalAmount || currentTotal;
      
      // Desconto
      const discPct = discountPercent ?? existingSale.discountPercent;
      const discAmt = discountAmount ?? existingSale.discountAmount;
      if (discPct > 0) {
        updateData.discountPercent = discPct;
        updateData.discountAmount = (currentTotal * discPct) / 100;
        finalAmount = currentTotal - updateData.discountAmount;
      } else if (discAmt > 0) {
        updateData.discountAmount = discAmt;
        updateData.discountPercent = currentTotal > 0 ? (discAmt / currentTotal) * 100 : 0;
        finalAmount = currentTotal - discAmt;
      }
      updateData.finalAmount = finalAmount;

      // Taxa de cartão
      const fee = cardFeePercent ?? existingSale.cardFeePercent;
      if (fee) {
        updateData.cardFeePercent = fee;
        updateData.cardFeeAmount = finalAmount * (fee / 100);
      }

      // Imposto
      const tax = taxRate ?? existingSale.taxRate;
      if (tax) {
        updateData.taxRate = tax;
        updateData.taxAmount = finalAmount * (tax / 100);
      }

      // Líquido
      updateData.netAmount = finalAmount
        - (updateData.cardFeeAmount || existingSale.cardFeeAmount || 0)
        - (updateData.taxAmount || existingSale.taxAmount || 0);
    }

    const updatedSale = await prisma.sale.update({
      where: { id: params.id },
      data: updateData,
      include: {
        patient: true,
        items: { include: { procedure: true } },
        sessions: { include: { procedure: true } },
        paymentSplits: { include: { installmentDetails: true } }
      }
    });

    return NextResponse.json(updatedSale);
  } catch (error) {
    console.error('Error updating sale:', error);
    return NextResponse.json({ error: 'Erro ao atualizar venda' }, { status: 500 });
  }
}

// PATCH /api/sales/[id] - Atualização parcial
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Reusa a lógica do PUT
  return PUT(request, { params });
}
