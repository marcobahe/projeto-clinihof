import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getUserWorkspace } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

/**
 * GET /api/quotes/[id]
 * Get a specific quote
 */
export async function GET(
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

    const quote = await prisma.quote.findFirst({
      where: {
        id,
        workspaceId: workspace.id
      },
      include: {
        patient: true,
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

    return NextResponse.json(quote);
  } catch (error) {
    console.error('Error fetching quote:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar orçamento' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/quotes/[id]
 * Update a quote
 */
export async function PATCH(
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

    // Check if quote exists
    const existingQuote = await prisma.quote.findFirst({
      where: {
        id,
        workspaceId: workspace.id
      }
    });

    if (!existingQuote) {
      return NextResponse.json(
        { error: 'Orçamento não encontrado' },
        { status: 404 }
      );
    }

    const { 
      status,
      title,
      notes,
      items,
      discountPercent,
      discountAmount,
      sentDate,
      expirationDate,
      acceptedDate,
      rejectedDate,
      leadSource
    } = body;

    // Prepare update data
    const updateData: any = {};

    if (status !== undefined) {
      updateData.status = status;
      
      // Auto-set dates based on status changes
      if (status === 'SENT' && !existingQuote.sentDate) {
        updateData.sentDate = new Date();
      }
      if (status === 'ACCEPTED' && !existingQuote.acceptedDate) {
        updateData.acceptedDate = new Date();
      }
      if (status === 'REJECTED' && !existingQuote.rejectedDate) {
        updateData.rejectedDate = new Date();
      }
    }

    if (title !== undefined) updateData.title = title;
    if (notes !== undefined) updateData.notes = notes;
    if (leadSource !== undefined) updateData.leadSource = leadSource;
    if (sentDate !== undefined) updateData.sentDate = sentDate ? new Date(sentDate) : null;
    if (expirationDate !== undefined) updateData.expirationDate = expirationDate ? new Date(expirationDate) : null;
    if (acceptedDate !== undefined) updateData.acceptedDate = acceptedDate ? new Date(acceptedDate) : null;
    if (rejectedDate !== undefined) updateData.rejectedDate = rejectedDate ? new Date(rejectedDate) : null;

    // If items are being updated, recalculate totals
    if (items && items.length > 0) {
      let totalAmount = 0;
      const itemsToCreate = [];

      for (const item of items) {
        const { procedureId, description, quantity, unitPrice } = item;
        
        if (!description || !quantity || !unitPrice) {
          return NextResponse.json(
            { error: 'Cada item deve ter: description, quantity, unitPrice' },
            { status: 400 }
          );
        }

        const totalPrice = quantity * unitPrice;
        totalAmount += totalPrice;

        itemsToCreate.push({
          procedureId: procedureId || null,
          description,
          quantity,
          unitPrice,
          totalPrice
        });
      }

      // Calculate final amount with discount
      let finalAmount = totalAmount;
      let finalDiscountAmount = discountAmount ?? existingQuote.discountAmount;
      let finalDiscountPercent = discountPercent ?? existingQuote.discountPercent;

      if (discountPercent !== undefined && discountPercent > 0) {
        finalDiscountAmount = (totalAmount * discountPercent) / 100;
        finalAmount = totalAmount - finalDiscountAmount;
      } else if (discountAmount !== undefined && discountAmount > 0) {
        finalAmount = totalAmount - discountAmount;
        finalDiscountPercent = (discountAmount / totalAmount) * 100;
      }

      updateData.totalAmount = totalAmount;
      updateData.discountPercent = finalDiscountPercent;
      updateData.discountAmount = finalDiscountAmount;
      updateData.finalAmount = finalAmount;

      // Delete existing items and create new ones
      await prisma.quoteItem.deleteMany({
        where: { quoteId: id }
      });

      await prisma.quoteItem.createMany({
        data: itemsToCreate.map(item => ({
          ...item,
          quoteId: id
        }))
      });
    } else {
      // Just update discount if provided
      if (discountPercent !== undefined || discountAmount !== undefined) {
        const currentTotal = existingQuote.totalAmount;
        let finalAmount = currentTotal;
        let finalDiscountAmount = discountAmount ?? existingQuote.discountAmount;
        let finalDiscountPercent = discountPercent ?? existingQuote.discountPercent;

        if (discountPercent !== undefined && discountPercent > 0) {
          finalDiscountAmount = (currentTotal * discountPercent) / 100;
          finalAmount = currentTotal - finalDiscountAmount;
        } else if (discountAmount !== undefined && discountAmount > 0) {
          finalAmount = currentTotal - discountAmount;
          finalDiscountPercent = (discountAmount / currentTotal) * 100;
        }

        updateData.discountPercent = finalDiscountPercent;
        updateData.discountAmount = finalDiscountAmount;
        updateData.finalAmount = finalAmount;
      }
    }

    // Update quote
    const updatedQuote = await prisma.quote.update({
      where: { id },
      data: updateData,
      include: {
        patient: true,
        items: {
          include: {
            procedure: true
          }
        }
      }
    });

    return NextResponse.json(updatedQuote);
  } catch (error) {
    console.error('Error updating quote:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar orçamento' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/quotes/[id]
 * Delete a quote
 */
export async function DELETE(
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

    // Check if quote exists
    const existingQuote = await prisma.quote.findFirst({
      where: {
        id,
        workspaceId: workspace.id
      }
    });

    if (!existingQuote) {
      return NextResponse.json(
        { error: 'Orçamento não encontrado' },
        { status: 404 }
      );
    }

    // Don't allow deletion of accepted quotes that are linked to sales
    if (existingQuote.status === 'ACCEPTED' && existingQuote.saleId) {
      return NextResponse.json(
        { error: 'Não é possível excluir um orçamento já convertido em venda' },
        { status: 400 }
      );
    }

    // Delete quote items first (cascade should handle this, but being explicit)
    await prisma.quoteItem.deleteMany({
      where: { quoteId: id }
    });

    // Delete quote
    await prisma.quote.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Orçamento excluído com sucesso' });
  } catch (error) {
    console.error('Error deleting quote:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir orçamento' },
      { status: 500 }
    );
  }
}
