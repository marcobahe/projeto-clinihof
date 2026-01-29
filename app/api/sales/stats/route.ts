import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/sales/stats - Get sales statistics
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

    // Total revenue
    const salesAggregate = await prisma.sale.aggregate({
      where: { workspaceId: workspace.id },
      _sum: {
        totalAmount: true,
      },
      _count: true,
    });

    // Pending sessions count
    const pendingSessions = await prisma.procedureSession.count({
      where: {
        sale: {
          workspaceId: workspace.id,
        },
        status: 'PENDING',
      },
    });

    // Completed sessions count
    const completedSessions = await prisma.procedureSession.count({
      where: {
        sale: {
          workspaceId: workspace.id,
        },
        status: 'COMPLETED',
      },
    });

    return NextResponse.json({
      totalRevenue: salesAggregate._sum.totalAmount || 0,
      completedSales: salesAggregate._count || 0,
      pendingSessions,
      completedSessions,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
