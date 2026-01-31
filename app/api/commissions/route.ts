import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getUserWorkspace } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

// GET /api/commissions - Get commission report
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

    const searchParams = req.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const sellerId = searchParams.get('sellerId');

    // Build filters
    const where: any = {
      workspaceId: workspace.id,
      sellerId: { not: null }, // Only sales with a seller
    };

    if (startDate && endDate) {
      where.saleDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (sellerId) {
      where.sellerId = sellerId;
    }

    // Get sales with seller info
    const sales = await prisma.sale.findMany({
      where,
      include: {
        patient: {
          select: { id: true, name: true },
        },
        seller: {
          select: {
            id: true,
            name: true,
            commissionType: true,
            commissionValue: true,
          },
        },
      },
      orderBy: { saleDate: 'desc' },
    });

    // Calculate commissions
    const commissionsData = sales.map((sale) => {
      const seller = sale.seller;
      if (!seller) return null;

      let commissionAmount = 0;
      let commissionRate = 0;

      if (seller.commissionType === 'PERCENTAGE') {
        commissionRate = seller.commissionValue;
        commissionAmount = (sale.totalAmount * seller.commissionValue) / 100;
      } else if (seller.commissionType === 'FIXED') {
        commissionAmount = seller.commissionValue;
        commissionRate = (seller.commissionValue / sale.totalAmount) * 100;
      }

      return {
        id: sale.id,
        saleDate: sale.saleDate,
        patientName: sale.patient.name,
        saleValue: sale.totalAmount,
        sellerId: seller.id,
        sellerName: seller.name,
        commissionType: seller.commissionType,
        commissionRate: parseFloat(commissionRate.toFixed(2)),
        commissionAmount: parseFloat(commissionAmount.toFixed(2)),
      };
    }).filter(Boolean);

    // Calculate totals by seller
    const sellerTotals: Record<string, { name: string; totalSales: number; totalCommission: number; salesCount: number }> = {};
    
    commissionsData.forEach((item) => {
      if (!item) return;
      if (!sellerTotals[item.sellerId]) {
        sellerTotals[item.sellerId] = {
          name: item.sellerName,
          totalSales: 0,
          totalCommission: 0,
          salesCount: 0,
        };
      }
      sellerTotals[item.sellerId].totalSales += item.saleValue;
      sellerTotals[item.sellerId].totalCommission += item.commissionAmount;
      sellerTotals[item.sellerId].salesCount += 1;
    });

    // Get collaborators list for filter dropdown
    const collaborators = await prisma.collaborator.findMany({
      where: {
        workspaceId: workspace.id,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    });

    const totalCommission = commissionsData.reduce((sum, item) => sum + (item?.commissionAmount || 0), 0);
    const totalSalesValue = commissionsData.reduce((sum, item) => sum + (item?.saleValue || 0), 0);

    return NextResponse.json({
      commissions: commissionsData,
      sellerTotals: Object.values(sellerTotals),
      summary: {
        totalSalesValue,
        totalCommission,
        salesCount: commissionsData.length,
      },
      collaborators,
    });
  } catch (error) {
    console.error('Get commissions error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar comissões' },
      { status: 500 }
    );
  }
}
