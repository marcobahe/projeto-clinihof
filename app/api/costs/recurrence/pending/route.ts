import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getUserWorkspace } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

/**
 * GET /api/costs/recurrence/pending
 * Lista custos recorrentes pendentes de replicação
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const workspace = await getUserWorkspace((session.user as any).id);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Busca custos recorrentes pendentes
    const pendingCosts = await prisma.cost.findMany({
      where: {
        workspaceId: workspace.id,
        isActive: true,
        costType: 'FIXED',
        recurrenceFrequency: {
          not: null,
        },
        nextRecurrenceDate: {
          lte: today,
        },
      },
      orderBy: {
        nextRecurrenceDate: 'asc',
      },
    });

    // Busca todos os custos recorrentes configurados
    const allRecurringCosts = await prisma.cost.findMany({
      where: {
        workspaceId: workspace.id,
        isActive: true,
        costType: 'FIXED',
        recurrenceFrequency: {
          not: null,
        },
      },
      orderBy: {
        nextRecurrenceDate: 'asc',
      },
    });

    // Custos próximos (nos próximos 7 dias)
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const upcomingCosts = await prisma.cost.findMany({
      where: {
        workspaceId: workspace.id,
        isActive: true,
        costType: 'FIXED',
        recurrenceFrequency: {
          not: null,
        },
        nextRecurrenceDate: {
          gt: today,
          lte: nextWeek,
        },
      },
      orderBy: {
        nextRecurrenceDate: 'asc',
      },
    });

    return NextResponse.json({
      pending: pendingCosts,
      pendingCount: pendingCosts.length,
      upcoming: upcomingCosts,
      upcomingCount: upcomingCosts.length,
      totalRecurring: allRecurringCosts.length,
      allRecurring: allRecurringCosts,
    });
  } catch (error) {
    console.error('Erro ao buscar custos recorrentes pendentes:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar custos recorrentes' },
      { status: 500 }
    );
  }
}
