import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getUserWorkspace } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

// GET - List all supplies
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const workspace = await getUserWorkspace((session.user as any).id);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    const supplies = await prisma.supply.findMany({
      where: {
        workspaceId: workspace.id,
        ...(search && {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        }),
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(supplies);
  } catch (error) {
    console.error('Error fetching supplies:', error);
    return NextResponse.json({ error: 'Erro ao buscar insumos' }, { status: 500 });
  }
}

// POST - Create new supply
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const workspace = await getUserWorkspace((session.user as any).id);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const { name, unit, costPerUnit, stockQty, minStock } = body;

    if (!name || !unit || costPerUnit === undefined) {
      return NextResponse.json(
        { error: 'Nome, unidade e custo por unidade são obrigatórios' },
        { status: 400 }
      );
    }

    // Check for duplicate supply
    const existingSupply = await prisma.supply.findUnique({
      where: {
        workspaceId_name_unit: {
          workspaceId: workspace.id,
          name,
          unit,
        },
      },
    });

    if (existingSupply) {
      return NextResponse.json(
        { error: 'Já existe um insumo com este nome e unidade. Edite o existente ao invés de criar um novo.' },
        { status: 409 }
      );
    }

    const supply = await prisma.supply.create({
      data: {
        workspaceId: workspace.id,
        name,
        unit,
        costPerUnit: parseFloat(costPerUnit) || 0,
        stockQty: parseInt(stockQty) || 0,
        minStock: parseInt(minStock) || 0,
      },
    });

    return NextResponse.json(supply, { status: 201 });
  } catch (error) {
    console.error('Error creating supply:', error);
    return NextResponse.json({ error: 'Erro ao criar insumo' }, { status: 500 });
  }
}
