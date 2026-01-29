import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/costs/stats - Get cost statistics
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

    // Get all active costs
    const costs = await prisma.cost.findMany({
      where: {
        workspaceId: workspace.id,
        isActive: true,
      },
    });

    // Calculate fixed costs total
    const fixedCostsTotal = costs
      .filter(cost => cost.costType === 'FIXED' && cost.isRecurring)
      .reduce((sum, cost) => sum + (cost.fixedValue || 0), 0);

    // Count items
    const totalItems = costs.filter(cost => cost.isRecurring).length;

    // Count by category
    const operational = costs.filter(cost => cost.category === 'OPERATIONAL').length;
    const taxes = costs.filter(cost => cost.category === 'TAX').length;
    const commissions = costs.filter(cost => cost.category === 'COMMISSION').length;

    return NextResponse.json({
      fixedCostsTotal,
      totalItems,
      categoryCounts: {
        operational,
        taxes,
        commissions,
      },
    });
  } catch (error) {
    console.error('Error fetching cost stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cost statistics' },
      { status: 500 }
    );
  }
}