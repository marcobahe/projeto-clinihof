import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getUserWorkspace } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

/**
 * GET /api/quotes/stats
 * Get quote statistics and conversion metrics
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    if (!userId) {
      return NextResponse.json({ error: 'ID do usuário não encontrado' }, { status: 400 });
    }

    const workspace = await getUserWorkspace(userId);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    const whereClause: any = {
      workspaceId: workspace.id
    };

    if (Object.keys(dateFilter).length > 0) {
      whereClause.createdDate = dateFilter;
    }

    // Get all quotes
    const allQuotes = await prisma.quote.findMany({
      where: whereClause,
      select: {
        id: true,
        status: true,
        finalAmount: true,
        leadSource: true,
        createdDate: true,
        sentDate: true,
        acceptedDate: true,
        rejectedDate: true
      }
    });

    // Calculate statistics
    const totalQuotes = allQuotes.length;
    const pendingQuotes = allQuotes.filter(q => q.status === 'PENDING').length;
    const sentQuotes = allQuotes.filter(q => q.status === 'SENT').length;
    const acceptedQuotes = allQuotes.filter(q => q.status === 'ACCEPTED').length;
    const rejectedQuotes = allQuotes.filter(q => q.status === 'REJECTED').length;
    const expiredQuotes = allQuotes.filter(q => q.status === 'EXPIRED').length;

    // Calculate conversion rate
    const conversionRate = totalQuotes > 0 
      ? (acceptedQuotes / totalQuotes) * 100 
      : 0;

    // Calculate total value by status
    const totalValue = allQuotes.reduce((sum, q) => sum + q.finalAmount, 0);
    const acceptedValue = allQuotes
      .filter(q => q.status === 'ACCEPTED')
      .reduce((sum, q) => sum + q.finalAmount, 0);
    const pendingValue = allQuotes
      .filter(q => q.status === 'PENDING' || q.status === 'SENT')
      .reduce((sum, q) => sum + q.finalAmount, 0);
    const lostValue = allQuotes
      .filter(q => q.status === 'REJECTED' || q.status === 'EXPIRED')
      .reduce((sum, q) => sum + q.finalAmount, 0);

    // Lead source analysis
    const leadSourceStats: { [key: string]: { count: number; value: number; accepted: number } } = {};
    
    allQuotes.forEach(quote => {
      const source = quote.leadSource || 'Não informado';
      if (!leadSourceStats[source]) {
        leadSourceStats[source] = { count: 0, value: 0, accepted: 0 };
      }
      leadSourceStats[source].count++;
      leadSourceStats[source].value += quote.finalAmount;
      if (quote.status === 'ACCEPTED') {
        leadSourceStats[source].accepted++;
      }
    });

    // Calculate average response time (time from creation to accepted/rejected)
    const completedQuotes = allQuotes.filter(
      q => (q.status === 'ACCEPTED' || q.status === 'REJECTED') && 
           (q.acceptedDate || q.rejectedDate)
    );

    let avgResponseTimeDays = 0;
    if (completedQuotes.length > 0) {
      const totalDays = completedQuotes.reduce((sum, q) => {
        const endDate = q.acceptedDate || q.rejectedDate;
        if (!endDate) return sum;
        const diffTime = endDate.getTime() - q.createdDate.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        return sum + diffDays;
      }, 0);
      avgResponseTimeDays = totalDays / completedQuotes.length;
    }

    // Monthly trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyQuotes = await prisma.quote.findMany({
      where: {
        workspaceId: workspace.id,
        createdDate: {
          gte: sixMonthsAgo
        }
      },
      select: {
        createdDate: true,
        status: true,
        finalAmount: true
      }
    });

    // Group by month
    const monthlyTrend: { [key: string]: { total: number; accepted: number; value: number; acceptedValue: number } } = {};
    
    monthlyQuotes.forEach(quote => {
      const monthKey = quote.createdDate.toISOString().substring(0, 7); // YYYY-MM
      if (!monthlyTrend[monthKey]) {
        monthlyTrend[monthKey] = { total: 0, accepted: 0, value: 0, acceptedValue: 0 };
      }
      monthlyTrend[monthKey].total++;
      monthlyTrend[monthKey].value += quote.finalAmount;
      if (quote.status === 'ACCEPTED') {
        monthlyTrend[monthKey].accepted++;
        monthlyTrend[monthKey].acceptedValue += quote.finalAmount;
      }
    });

    return NextResponse.json({
      summary: {
        totalQuotes,
        pendingQuotes,
        sentQuotes,
        acceptedQuotes,
        rejectedQuotes,
        expiredQuotes,
        conversionRate: parseFloat(conversionRate.toFixed(2)),
        avgResponseTimeDays: parseFloat(avgResponseTimeDays.toFixed(1))
      },
      values: {
        totalValue,
        acceptedValue,
        pendingValue,
        lostValue
      },
      leadSources: Object.entries(leadSourceStats).map(([source, stats]) => ({
        source,
        count: stats.count,
        value: stats.value,
        accepted: stats.accepted,
        conversionRate: stats.count > 0 ? parseFloat(((stats.accepted / stats.count) * 100).toFixed(2)) : 0
      })),
      monthlyTrend: Object.entries(monthlyTrend)
        .map(([month, data]) => ({
          month,
          total: data.total,
          accepted: data.accepted,
          value: data.value,
          acceptedValue: data.acceptedValue,
          conversionRate: data.total > 0 ? parseFloat(((data.accepted / data.total) * 100).toFixed(2)) : 0
        }))
        .sort((a, b) => a.month.localeCompare(b.month))
    });
  } catch (error) {
    console.error('Error fetching quote stats:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar estatísticas de orçamentos' },
      { status: 500 }
    );
  }
}
