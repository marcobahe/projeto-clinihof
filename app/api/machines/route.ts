import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/machines - Listar máquinas de cartão
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const workspace = await getUserWorkspace((session.user as any).id);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
    }

    const machines = await prisma.machineConfig.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(machines);
  } catch (error) {
    console.error('Error fetching machines:', error);
    return NextResponse.json({ error: 'Erro ao buscar máquinas' }, { status: 500 });
  }
}

// POST /api/machines - Criar máquina de cartão
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
    const { name, brand, debitFee, creditFee1x, creditFee2x6x, creditFee7x12x } = body;

    if (!name) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }

    const machine = await prisma.machineConfig.create({
      data: {
        workspaceId: workspace.id,
        name,
        brand: brand || null,
        debitFee: parseFloat(debitFee) || 0,
        creditFee1x: parseFloat(creditFee1x) || 0,
        creditFee2x6x: parseFloat(creditFee2x6x) || 0,
        creditFee7x12x: parseFloat(creditFee7x12x) || 0,
      }
    });

    return NextResponse.json(machine, { status: 201 });
  } catch (error) {
    console.error('Error creating machine:', error);
    return NextResponse.json({ error: 'Erro ao criar máquina' }, { status: 500 });
  }
}
