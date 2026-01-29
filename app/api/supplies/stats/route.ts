import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getUserWorkspace } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspace = await getUserWorkspace((session.user as any).id);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Total supplies count
    const totalSupplies = await prisma.supply.count({
      where: { workspaceId: workspace.id },
    });

    // Total inventory value (cost * quantity)
    const supplies = await prisma.supply.findMany({
      where: { workspaceId: workspace.id },
      select: {
        costPerUnit: true,
        stockQty: true,
        minStock: true,
      },
    });

    const totalInventoryValue = supplies.reduce(
      (sum, supply) => sum + supply.costPerUnit * supply.stockQty,
      0
    );

    // Low stock items (stock <= minStock)
    const lowStockItems = supplies.filter(
      (supply) => supply.stockQty <= supply.minStock
    ).length;

    // Out of stock items (stock = 0)
    const outOfStockItems = supplies.filter(
      (supply) => supply.stockQty === 0
    ).length;

    return NextResponse.json({
      totalSupplies,
      totalInventoryValue,
      lowStockItems,
      outOfStockItems,
    });
  } catch (error) {
    console.error('Failed to fetch supply stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch supply stats' },
      { status: 500 }
    );
  }
}
