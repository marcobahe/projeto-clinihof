import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getUserWorkspace } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const workspace = await getUserWorkspace((session.user as any).id);

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
    }

    // Get current month start and end
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [
      patients,
      procedures,
      totalRevenue,
      salesThisMonth,
      pendingSessions,
      completedSessions,
    ] = await Promise.all([
      prisma.patient.count({
        where: { workspaceId: workspace.id },
      }),
      prisma.procedure.count({
        where: { workspaceId: workspace.id },
      }),
      prisma.sale.aggregate({
        where: { workspaceId: workspace.id },
        _sum: { totalAmount: true },
      }),
      prisma.sale.count({
        where: {
          workspaceId: workspace.id,
          saleDate: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      }),
      prisma.procedureSession.count({
        where: {
          sale: { workspaceId: workspace.id },
          status: 'PENDING',
        },
      }),
      prisma.procedureSession.count({
        where: {
          sale: { workspaceId: workspace.id },
          status: 'COMPLETED',
        },
      }),
    ]);

    return NextResponse.json({
      patients,
      procedures,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      salesThisMonth,
      pendingSessions,
      completedSessions,
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'Erro ao buscar estatísticas' }, { status: 500 });
  }
}
