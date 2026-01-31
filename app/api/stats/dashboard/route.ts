import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/db';
import { startOfMonth, endOfMonth, subMonths, format, startOfDay, endOfDay, startOfWeek, endOfWeek, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspace = await getUserWorkspace((session.user as any).id);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Get date range from query parameters
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'month'; // today, week, month, custom
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // Calculate date range based on period
    const now = new Date();
    let currentMonthStart: Date;
    let currentMonthEnd: Date;

    if (period === 'custom' && startDateParam && endDateParam) {
      currentMonthStart = startOfDay(new Date(startDateParam));
      currentMonthEnd = endOfDay(new Date(endDateParam));
    } else if (period === 'today') {
      currentMonthStart = startOfDay(now);
      currentMonthEnd = endOfDay(now);
    } else if (period === 'week') {
      currentMonthStart = startOfWeek(now, { locale: ptBR });
      currentMonthEnd = endOfWeek(now, { locale: ptBR });
    } else if (period === 'last7days') {
      currentMonthStart = startOfDay(subDays(now, 6));
      currentMonthEnd = endOfDay(now);
    } else if (period === 'last15days') {
      currentMonthStart = startOfDay(subDays(now, 14));
      currentMonthEnd = endOfDay(now);
    } else if (period === 'last30days') {
      currentMonthStart = startOfDay(subDays(now, 29));
      currentMonthEnd = endOfDay(now);
    } else {
      // Default: current month
      currentMonthStart = startOfMonth(now);
      currentMonthEnd = endOfMonth(now);
    }

    // Fetch all sales with related data for current month
    const salesCurrentMonth = await prisma.sale.findMany({
      where: {
        workspaceId: workspace.id,
        saleDate: {
          gte: currentMonthStart,
          lte: currentMonthEnd,
        },
      },
      include: {
        items: {
          include: {
            procedure: {
              include: {
                supplies: {
                  include: {
                    supply: true,
                  },
                },
                collaborators: {
                  include: {
                    collaborator: true,
                  },
                },
              },
            },
          },
        },
        sessions: true,
        paymentSplits: true,
      },
    });

    // Fetch all sales for all time (for total stats)
    const salesAllTime = await prisma.sale.findMany({
      where: {
        workspaceId: workspace.id,
      },
      include: {
        sessions: true,
      },
    });

    // Calculate gross revenue (faturamento bruto)
    const grossRevenue = salesCurrentMonth.reduce((sum, sale) => sum + parseFloat(sale.totalAmount.toString()), 0);

    // Calculate cost of goods and labor for current month sales
    let totalSupplyCosts = 0;
    let totalLaborCosts = 0;

    salesCurrentMonth.forEach(sale => {
      sale.items.forEach(item => {
        const procedure = item.procedure;
        
        // Calculate supply costs (multiply by item quantity for packages)
        procedure.supplies.forEach(ps => {
          const supplyCost = parseFloat(ps.supply.costPerUnit.toString()) * ps.quantity * item.quantity;
          totalSupplyCosts += supplyCost;
        });

        // Calculate labor costs (collaborator costs, multiply by item quantity for packages)
        procedure.collaborators.forEach(pc => {
          const collaborator = pc.collaborator;
          if (collaborator.commissionType === 'PERCENTAGE') {
            // For percentage commission, calculate based on procedure unit price
            const procedurePrice = parseFloat(item.unitPrice.toString());
            const commission = (procedurePrice * collaborator.commissionValue) / 100;
            totalLaborCosts += commission * item.quantity;
          } else {
            // For fixed commission, multiply by quantity
            totalLaborCosts += collaborator.commissionValue * item.quantity;
          }
        });
      });
    });

    // TODO: Make tax rate configurable in workspace settings
    // Currently using 15% as default but should be configurable
    // Check if workspace has custom tax settings, otherwise use default 15%
    const defaultTaxRate = 0.15; // 15% default rate
    // In future: const taxRate = workspace.settings?.taxRate || defaultTaxRate;
    const estimatedTaxes = grossRevenue * defaultTaxRate;

    // Calculate net revenue (faturamento líquido)
    const netRevenue = grossRevenue - totalSupplyCosts - totalLaborCosts - estimatedTaxes;

    // Calculate total deductions
    const totalDeductions = totalSupplyCosts + totalLaborCosts + estimatedTaxes;

    // Count completed sales (all sessions completed)
    const completedSales = salesCurrentMonth.filter(sale => {
      const totalSessions = sale.sessions.length;
      const completedSessions = sale.sessions.filter(s => s.status === 'COMPLETED').length;
      return totalSessions > 0 && completedSessions === totalSessions;
    }).length;

    // Count total sessions
    const totalSessions = salesCurrentMonth.reduce((sum, sale) => sum + sale.sessions.length, 0);
    const completedSessions = salesCurrentMonth.reduce((sum, sale) => {
      return sum + sale.sessions.filter(s => s.status === 'COMPLETED').length;
    }, 0);
    const pendingSessions = totalSessions - completedSessions;

    // Get revenue trend for last 6 months
    const revenueTrend = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      const monthSales = await prisma.sale.findMany({
        where: {
          workspaceId: workspace.id,
          saleDate: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
      });

      const monthRevenue = monthSales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount.toString()), 0);

      revenueTrend.push({
        month: format(monthDate, 'MMM'),
        revenue: monthRevenue,
      });
    }

    // Get payment method distribution
    const paymentMethodStats = salesCurrentMonth.reduce((acc, sale) => {
      // If sale has payment splits, distribute amounts by actual payment methods
      if (sale.paymentSplits && sale.paymentSplits.length > 0) {
        sale.paymentSplits.forEach(split => {
          const method = split.paymentMethod;
          if (!acc[method]) {
            acc[method] = 0;
          }
          acc[method] += parseFloat(split.amount.toString());
        });
      } else if (sale.paymentMethod) {
        // For non-split payments with payment method defined, use it directly
        const method = sale.paymentMethod;
        if (!acc[method]) {
          acc[method] = 0;
        }
        acc[method] += parseFloat(sale.totalAmount.toString());
      }
      // If no payment method and no splits, skip (shouldn't happen in normal cases)
      return acc;
    }, {} as Record<string, number>);

    // Get session status distribution (all time)
    const sessionStats = salesAllTime.reduce(
      (acc, sale) => {
        sale.sessions.forEach(session => {
          if (session.status === 'COMPLETED') {
            acc.completed++;
          } else if (session.status === 'PENDING') {
            acc.pending++;
          } else if (session.status === 'CANCELLED') {
            acc.cancelled++;
          }
        });
        return acc;
      },
      { completed: 0, pending: 0, cancelled: 0 }
    );

    // Get most sold procedures in current month
    const proceduresSalesCount: Record<string, { name: string; count: number; revenue: number }> = {};
    
    salesCurrentMonth.forEach(sale => {
      sale.items.forEach(item => {
        const procedureId = item.procedure.id;
        const procedureName = item.procedure.name;
        const quantity = item.quantity;
        const revenue = parseFloat(item.unitPrice.toString()) * quantity;
        
        if (!proceduresSalesCount[procedureId]) {
          proceduresSalesCount[procedureId] = {
            name: procedureName,
            count: 0,
            revenue: 0,
          };
        }
        
        proceduresSalesCount[procedureId].count += quantity;
        proceduresSalesCount[procedureId].revenue += revenue;
      });
    });
    
    // Convert to array and sort by count (descending)
    const topProcedures = Object.values(proceduresSalesCount)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 most sold procedures

    // Get hourly cost per professional type
    const collaborators = await prisma.collaborator.findMany({
      where: {
        workspaceId: workspace.id,
        isActive: true,
      },
      select: {
        role: true,
        baseSalary: true,
        charges: true,
        monthlyHours: true,
      },
    });

    // Group by role and calculate average hourly cost
    const hourlyCostByRole: Record<string, { totalCost: number; totalHours: number; count: number }> = {};
    
    collaborators.forEach(collab => {
      const role = collab.role;
      const monthlyCost = parseFloat(collab.baseSalary.toString()) + parseFloat(collab.charges.toString());
      const hours = collab.monthlyHours;
      
      if (!hourlyCostByRole[role]) {
        hourlyCostByRole[role] = {
          totalCost: 0,
          totalHours: 0,
          count: 0,
        };
      }
      
      hourlyCostByRole[role].totalCost += monthlyCost;
      hourlyCostByRole[role].totalHours += hours;
      hourlyCostByRole[role].count += 1;
    });
    
    // Calculate average hourly cost per role
    const professionalCosts = Object.entries(hourlyCostByRole).map(([role, data]) => ({
      role,
      hourlyCost: data.totalHours > 0 ? data.totalCost / data.totalHours : 0,
      professionals: data.count,
    }))
    .sort((a, b) => b.hourlyCost - a.hourlyCost); // Sort by hourly cost (descending)

    // ======= NEW METRICS: Conversion (Quotes → Sales) =======
    const quotesCurrentPeriod = await prisma.quote.findMany({
      where: {
        workspaceId: workspace.id,
        createdDate: {
          gte: currentMonthStart,
          lte: currentMonthEnd,
        },
      },
    });

    const totalQuotes = quotesCurrentPeriod.length;
    const convertedQuotes = quotesCurrentPeriod.filter(q => q.status === 'ACCEPTED').length;
    const conversionRate = totalQuotes > 0 ? (convertedQuotes / totalQuotes) * 100 : 0;

    const quotesByStatus = quotesCurrentPeriod.reduce((acc, quote) => {
      const status = quote.status;
      if (!acc[status]) acc[status] = 0;
      acc[status]++;
      return acc;
    }, {} as Record<string, number>);

    // ======= NEW METRICS: Card Fees (Gross vs Net) =======
    // Calculate total card fees from payment splits
    let totalCardFees = 0;
    
    // Fetch all card fee rules for this workspace
    const cardFeeRules = await prisma.cardFeeRule.findMany({
      where: {
        workspaceId: workspace.id,
        isActive: true,
      },
    });

    salesCurrentMonth.forEach(sale => {
      if (sale.paymentSplits && sale.paymentSplits.length > 0) {
        sale.paymentSplits.forEach(split => {
          // Only calculate fees for credit card payments
          if (split.paymentMethod === 'CREDIT_CARD' && split.installments > 0) {
            // Find matching fee rule by exact installment count
            const feeRule = cardFeeRules.find(rule => 
              rule.installmentCount === split.installments
            );
            
            if (feeRule) {
              const feeAmount = parseFloat(split.amount.toString()) * (feeRule.feePercentage / 100);
              totalCardFees += feeAmount;
            }
          }
        });
      }
    });

    // Adjust net revenue calculation to include card fees
    const netRevenueWithCardFees = grossRevenue - totalSupplyCosts - totalLaborCosts - estimatedTaxes - totalCardFees;
    const totalDeductionsWithCardFees = totalSupplyCosts + totalLaborCosts + estimatedTaxes + totalCardFees;

    // ======= NEW METRICS: Future Receivables (A Receber) =======
    const currentTime = new Date();
    const next30Days = new Date(currentTime);
    next30Days.setDate(currentTime.getDate() + 30);
    const next60Days = new Date(currentTime);
    next60Days.setDate(currentTime.getDate() + 60);
    const next90Days = new Date(currentTime);
    next90Days.setDate(currentTime.getDate() + 90);

    // Get all pending payment installments
    const futureReceivables = await prisma.paymentInstallment.findMany({
      where: {
        paymentSplit: {
          sale: {
            workspaceId: workspace.id,
          },
        },
        status: 'PENDING',
        dueDate: {
          gte: currentTime,
        },
      },
      include: {
        paymentSplit: {
          include: {
            sale: true,
          },
        },
      },
      orderBy: {
        dueDate: 'asc',
      },
    });

    // Group by time periods
    const receivables30Days = futureReceivables
      .filter(r => r.dueDate && r.dueDate <= next30Days)
      .reduce((sum, r) => sum + parseFloat(r.amount.toString()), 0);

    const receivables60Days = futureReceivables
      .filter(r => r.dueDate && r.dueDate > next30Days && r.dueDate <= next60Days)
      .reduce((sum, r) => sum + parseFloat(r.amount.toString()), 0);

    const receivables90Days = futureReceivables
      .filter(r => r.dueDate && r.dueDate > next60Days && r.dueDate <= next90Days)
      .reduce((sum, r) => sum + parseFloat(r.amount.toString()), 0);

    const totalFutureReceivables = futureReceivables.reduce(
      (sum, r) => sum + parseFloat(r.amount.toString()), 
      0
    );

    // ======= NEW METRICS: New Patients =======
    const newPatients = await prisma.patient.count({
      where: {
        workspaceId: workspace.id,
        createdAt: {
          gte: currentMonthStart,
          lte: currentMonthEnd,
        },
      },
    });

    const totalPatients = await prisma.patient.count({
      where: {
        workspaceId: workspace.id,
      },
    });

    return NextResponse.json({
      // Financial metrics (current period)
      financial: {
        grossRevenue,
        netRevenue: netRevenueWithCardFees,
        totalDeductions: totalDeductionsWithCardFees,
        breakdown: {
          supplyCosts: totalSupplyCosts,
          laborCosts: totalLaborCosts,
          taxesAndFees: estimatedTaxes,
          cardFees: totalCardFees,
        },
      },
      // Operational metrics (current period)
      operations: {
        completedSales,
        totalSales: salesCurrentMonth.length,
        completedSessions,
        pendingSessions,
        totalSessions,
      },
      // NEW: Conversion metrics (quotes → sales)
      conversion: {
        totalQuotes,
        convertedQuotes,
        conversionRate,
        quotesByStatus,
      },
      // NEW: Future receivables (a receber)
      receivables: {
        next30Days: receivables30Days,
        next60Days: receivables60Days,
        next90Days: receivables90Days,
        total: totalFutureReceivables,
        count: futureReceivables.length,
      },
      // NEW: Patient growth metrics
      patients: {
        newPatients,
        totalPatients,
        newPatientRate: totalPatients > 0 ? (newPatients / totalPatients) * 100 : 0,
      },
      // Charts data
      charts: {
        revenueTrend,
        paymentMethods: Object.entries(paymentMethodStats).map(([method, amount]) => ({
          method,
          amount,
        })),
        sessionStatus: [
          { status: 'Concluídas', count: sessionStats.completed },
          { status: 'Pendentes', count: sessionStats.pending },
          { status: 'Canceladas', count: sessionStats.cancelled },
        ],
      },
      // Top selling procedures (current period)
      topProcedures,
      // Hourly cost per professional type
      professionalCosts,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}
