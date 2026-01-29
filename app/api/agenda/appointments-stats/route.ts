import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getUserWorkspace } from '@/lib/workspace';
import { startOfMonth, endOfMonth } from 'date-fns';

export const dynamic = 'force-dynamic';

/**
 * GET /api/agenda/appointments-stats
 * Retorna estatísticas de consultas por tipo
 */
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

    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // Busca todas as sessões do mês atual
    const sessions = await prisma.procedureSession.findMany({
      where: {
        sale: {
          workspaceId: workspace.id,
        },
        scheduledDate: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      include: {
        sale: {
          include: {
            patient: true,
            paymentSplits: true,
          },
        },
        procedure: true,
      },
    });

    // Contadores por tipo
    const firstVisits = sessions.filter(s => s.appointmentType === 'FIRST_VISIT');
    const paymentPending = sessions.filter(s => s.appointmentType === 'PAYMENT_PENDING');
    const followUps = sessions.filter(s => s.appointmentType === 'FOLLOW_UP');
    const unclassified = sessions.filter(s => !s.appointmentType);

    // Estatísticas de primeira consulta
    const firstVisitStats = {
      total: firstVisits.length,
      completed: firstVisits.filter(s => s.status === 'COMPLETED').length,
      scheduled: firstVisits.filter(s => s.status === 'SCHEDULED').length,
      pending: firstVisits.filter(s => s.status === 'PENDING').length,
      conversionRate: 0,
    };

    // Taxa de conversão (primeiras consultas completadas que geraram vendas)
    if (firstVisitStats.completed > 0) {
      const completedFirstVisits = firstVisits.filter(s => s.status === 'COMPLETED');
      const convertedSales = completedFirstVisits.filter(s => {
        // Considera convertido se a venda tem mais de 1 sessão ou valor > 0
        return s.sale.totalAmount > 0;
      });
      firstVisitStats.conversionRate = (convertedSales.length / firstVisitStats.completed) * 100;
    }

    // Estatísticas de pendência de pagamento
    const paymentPendingStats = {
      total: paymentPending.length,
      totalAmount: 0,
      patientsAffected: new Set(paymentPending.map(s => s.sale.patient.id)).size,
    };

    // Calcula valor total pendente
    paymentPending.forEach(session => {
      const sale = session.sale;
      // Soma valores de parcelas pendentes
      const paidAmount = sale.paymentSplits.reduce((sum, split) => {
        const installments = (split as any).installments || [];
        return sum + installments.filter((i: any) => i.status === 'PAID').reduce((s: number, i: any) => s + i.amount, 0);
      }, 0);
      const pendingAmount = sale.totalAmount - paidAmount;
      paymentPendingStats.totalAmount += pendingAmount;
    });

    // Estatísticas de retorno
    const followUpStats = {
      total: followUps.length,
      completed: followUps.filter(s => s.status === 'COMPLETED').length,
      scheduled: followUps.filter(s => s.status === 'SCHEDULED').length,
      adherenceRate: 0,
    };

    // Taxa de aderência (retornos agendados que foram completados)
    if (followUps.length > 0) {
      followUpStats.adherenceRate = (followUpStats.completed / followUps.length) * 100;
    }

    return NextResponse.json({
      period: {
        start: monthStart,
        end: monthEnd,
      },
      summary: {
        total: sessions.length,
        firstVisits: firstVisitStats.total,
        paymentPending: paymentPendingStats.total,
        followUps: followUpStats.total,
        unclassified: unclassified.length,
      },
      firstVisits: firstVisitStats,
      paymentPending: paymentPendingStats,
      followUps: followUpStats,
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas de consultas:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar estatísticas' },
      { status: 500 }
    );
  }
}
