import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/costs/[id] - Get a specific cost
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

    const cost = await prisma.cost.findFirst({
      where: {
        id: params.id,
        workspaceId: workspace.id,
      },
    });

    if (!cost) {
      return NextResponse.json({ error: 'Cost not found' }, { status: 404 });
    }

    return NextResponse.json(cost);
  } catch (error) {
    console.error('Error fetching cost:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cost' },
      { status: 500 }
    );
  }
}

// PATCH /api/costs/[id] - Update a cost
export async function PATCH(
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

    const existingCost = await prisma.cost.findFirst({
      where: {
        id: params.id,
        workspaceId: workspace.id,
      },
    });

    if (!existingCost) {
      return NextResponse.json({ error: 'Cost not found' }, { status: 404 });
    }

    const body = await request.json();
    const { 
      description, 
      costType, 
      category, 
      customCategory, 
      fixedValue, 
      percentage, 
      isRecurring, 
      isActive, 
      paymentDate, 
      cardOperator, 
      receivingDays,
      recurrenceFrequency,
      nextRecurrenceDate
    } = body;

    // Validações
    if (category === 'CUSTOM' && !customCategory) {
      return NextResponse.json(
        { error: 'Nome da categoria customizada é obrigatório' },
        { status: 400 }
      );
    }

    if (costType === 'FIXED' && fixedValue !== undefined && fixedValue <= 0) {
      return NextResponse.json(
        { error: 'Valor fixo deve ser maior que zero' },
        { status: 400 }
      );
    }

    if (costType === 'PERCENTAGE' && percentage !== undefined && (percentage <= 0 || percentage > 100)) {
      return NextResponse.json(
        { error: 'Percentual deve estar entre 0 e 100' },
        { status: 400 }
      );
    }

    // Validação específica para taxas de cartão
    if (category === 'CARD') {
      if (cardOperator !== undefined && !cardOperator) {
        return NextResponse.json(
          { error: 'Operadora do cartão é obrigatória para taxas de cartão' },
          { status: 400 }
        );
      }
      if (receivingDays !== undefined && receivingDays <= 0) {
        return NextResponse.json(
          { error: 'Prazo de recebimento deve ser maior que zero' },
          { status: 400 }
        );
      }
    }

    const cost = await prisma.cost.update({
      where: { id: params.id },
      data: {
        ...(description && { description }),
        ...(costType && { costType }),
        ...(category && { category }),
        ...(category === 'CUSTOM' && customCategory && { customCategory }),
        ...(category && category !== 'CUSTOM' && { customCategory: null }),
        ...(category === 'CARD' && cardOperator !== undefined && { cardOperator }),
        ...(category === 'CARD' && receivingDays !== undefined && { receivingDays }),
        ...(category && category !== 'CARD' && { cardOperator: null, receivingDays: null }),
        ...(costType === 'FIXED' && fixedValue !== undefined && { fixedValue, percentage: null }),
        ...(costType === 'PERCENTAGE' && percentage !== undefined && { percentage, fixedValue: null }),
        ...(isRecurring !== undefined && { isRecurring }),
        ...(isActive !== undefined && { isActive }),
        ...(paymentDate !== undefined && { paymentDate: paymentDate ? new Date(paymentDate) : null }),
        ...(recurrenceFrequency !== undefined && { recurrenceFrequency }),
        ...(nextRecurrenceDate !== undefined && { nextRecurrenceDate: nextRecurrenceDate ? new Date(nextRecurrenceDate) : null }),
      },
    });

    return NextResponse.json(cost);
  } catch (error) {
    console.error('Error updating cost:', error);
    return NextResponse.json(
      { error: 'Failed to update cost' },
      { status: 500 }
    );
  }
}

// DELETE /api/costs/[id] - Delete a cost (soft delete)
export async function DELETE(
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

    const existingCost = await prisma.cost.findFirst({
      where: {
        id: params.id,
        workspaceId: workspace.id,
      },
    });

    if (!existingCost) {
      return NextResponse.json({ error: 'Cost not found' }, { status: 404 });
    }

    // Soft delete - just mark as inactive
    await prisma.cost.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({ message: 'Cost deleted successfully' });
  } catch (error) {
    console.error('Error deleting cost:', error);
    return NextResponse.json(
      { error: 'Failed to delete cost' },
      { status: 500 }
    );
  }
}