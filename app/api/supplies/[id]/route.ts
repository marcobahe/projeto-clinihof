import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getUserWorkspace } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

// GET - Get supply by ID
export async function GET(
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

    const { id } = await params;
    const supply = await prisma.supply.findFirst({
      where: {
        id,
        workspaceId: workspace.id,
      },
    });

    if (!supply) {
      return NextResponse.json({ error: 'Insumo não encontrado' }, { status: 404 });
    }

    return NextResponse.json(supply);
  } catch (error) {
    console.error('Error fetching supply:', error);
    return NextResponse.json({ error: 'Erro ao buscar insumo' }, { status: 500 });
  }
}

// PATCH - Update supply
export async function PATCH(
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

    const { id } = await params;
    const body = await request.json();
    const { name, unit, costPerUnit, stockQty, minStock } = body;

    // Check if supply exists and belongs to workspace
    const existing = await prisma.supply.findFirst({
      where: {
        id,
        workspaceId: workspace.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Insumo não encontrado' }, { status: 404 });
    }

    const supply = await prisma.supply.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(unit && { unit }),
        ...(costPerUnit !== undefined && { costPerUnit: parseFloat(costPerUnit) || 0 }),
        ...(stockQty !== undefined && { stockQty: parseInt(stockQty) || 0 }),
        ...(minStock !== undefined && { minStock: parseInt(minStock) || 0 }),
      },
    });

    return NextResponse.json(supply);
  } catch (error) {
    console.error('Error updating supply:', error);
    return NextResponse.json({ error: 'Erro ao atualizar insumo' }, { status: 500 });
  }
}

// DELETE - Delete supply
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

    const { id } = await params;
    
    // Check if supply exists and belongs to workspace
    const existing = await prisma.supply.findFirst({
      where: {
        id,
        workspaceId: workspace.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Insumo não encontrado' }, { status: 404 });
    }

    await prisma.supply.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting supply:', error);
    return NextResponse.json({ error: 'Erro ao excluir insumo' }, { status: 500 });
  }
}
