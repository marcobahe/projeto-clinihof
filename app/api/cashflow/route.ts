import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/db';
import { startOfDay, endOfDay, format, eachDayOfInterval, parseISO } from 'date-fns';

export const dynamic = 'force-dynamic';

interface ReceivableItem {
  id: string;
  date: Date;
  amount: number;
  patientName: string;
  procedureName: string;
  paymentMethod: string;
  installmentNumber: number;
  totalInstallments: number;
  status: string;
}

interface ExpenseItem {
  id: string;
  date: Date;
  amount: number;
  description: string;
  category: string;
  customCategory: string | null;
  isRecurring: boolean;
}

interface DailyCashFlow {
  date: string;
  receivables: number;
  expenses: number;
  netFlow: number;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspace = await getUserWorkspace((session.user as any).id);
    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace não encontrado' },
        { status: 404 }
      );
    }

    // Get date range from query params
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    if (!startDateParam || !endDateParam) {
      return NextResponse.json(
        { error: 'Parâmetros startDate e endDate são obrigatórios' },
        { status: 400 }
      );
    }

    const startDate = startOfDay(parseISO(startDateParam));
    const endDate = endOfDay(parseISO(endDateParam));

    // 1. FETCH RECEIVABLES (Payment Installments)
    const installments = await prisma.paymentInstallment.findMany({
      where: {
        paymentSplit: {
          sale: {
            workspaceId: workspace.id,
          },
        },
        dueDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        paymentSplit: {
          include: {
            sale: {
              include: {
                patient: true,
                items: {
                  include: {
                    procedure: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        dueDate: 'asc',
      },
    });

    // Transform installments into receivable items
    const receivables: ReceivableItem[] = installments
      .filter((inst) => inst.dueDate)
      .map((inst) => {
        const sale = inst.paymentSplit.sale;
        const procedureNames = sale.items.map((item) => item.procedure.name).join(', ');
        
        return {
          id: inst.id,
          date: inst.dueDate!,
          amount: inst.amount,
          patientName: sale.patient.name,
          procedureName: procedureNames || 'N/A',
          paymentMethod: formatPaymentMethod(inst.paymentSplit.paymentMethod),
          installmentNumber: inst.installmentNumber,
          totalInstallments: inst.paymentSplit.installments,
          status: inst.status,
        };
      });

    // 2. FETCH EXPENSES (Costs)
    // For recurring costs without specific payment date, we need to include them in the period
    const costs = await prisma.cost.findMany({
      where: {
        workspaceId: workspace.id,
        isActive: true,
        OR: [
          {
            // Costs with specific payment date in range
            paymentDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          {
            // Recurring costs without specific date (assume they apply to the period)
            paymentDate: null,
            isRecurring: true,
          },
        ],
      },
      orderBy: {
        paymentDate: 'asc',
      },
    });

    // 3. FETCH COST INSTALLMENTS (Parcelas de custos parcelados)
    const costInstallments = await prisma.costInstallment.findMany({
      where: {
        cost: {
          workspaceId: workspace.id,
          isActive: true,
        },
        dueDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        cost: true,
      },
      orderBy: {
        dueDate: 'asc',
      },
    });

    // Transform costs into expense items
    // Use a Set to track processed recurring costs to avoid duplicates
    const processedCosts = new Set<string>();
    const expenses: ExpenseItem[] = [];

    costs.forEach((cost) => {
      // For recurring costs without payment date, ensure they appear only once per period
      if (cost.isRecurring && !cost.paymentDate) {
        if (processedCosts.has(cost.id)) {
          return; // Skip if already processed
        }
        processedCosts.add(cost.id);
      }

      // If no payment date, use start of period for display
      const displayDate = cost.paymentDate || startDate;
      
      // Calculate amount based on costType
      let amount = 0;
      if (cost.costType === 'FIXED' && cost.fixedValue) {
        amount = cost.fixedValue;
      } else if (cost.costType === 'PERCENTAGE' && cost.percentage) {
        // For percentage costs, we'd need to calculate based on sales
        // For now, we'll mark it as 0 or estimate
        amount = 0; // Will be calculated separately if needed
      }

      expenses.push({
        id: cost.id,
        date: displayDate,
        amount,
        description: cost.description,
        category: formatCostCategory(cost.category),
        customCategory: cost.customCategory,
        isRecurring: cost.isRecurring,
      });
    });

    // Add cost installments to expenses
    const installmentExpenses: ExpenseItem[] = costInstallments.map((installment) => {
      return {
        id: installment.id,
        date: installment.dueDate,
        amount: installment.amount,
        description: `${installment.cost.description} (Parcela ${installment.installmentNumber})`,
        category: formatCostCategory(installment.cost.category),
        customCategory: installment.cost.customCategory,
        isRecurring: true,
      };
    });

    // Merge both expense types
    expenses.push(...installmentExpenses);

    // For percentage-based costs, calculate based on actual sales in the period
    const percentageCosts = costs.filter(
      (cost) => cost.costType === 'PERCENTAGE' && cost.percentage
    );

    if (percentageCosts.length > 0) {
      // Get total sales in the period
      const salesInPeriod = await prisma.sale.findMany({
        where: {
          workspaceId: workspace.id,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      const totalSalesAmount = salesInPeriod.reduce(
        (sum, sale) => sum + sale.totalAmount,
        0
      );

      // Update expense amounts for percentage costs
      percentageCosts.forEach((cost) => {
        const expenseIndex = expenses.findIndex((exp) => exp.id === cost.id);
        if (expenseIndex !== -1 && cost.percentage) {
          expenses[expenseIndex].amount = (totalSalesAmount * cost.percentage) / 100;
        }
      });
    }

    // 3. CALCULATE TOTALS
    const totalReceivables = receivables.reduce((sum, item) => sum + item.amount, 0);
    const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
    const netCashFlow = totalReceivables - totalExpenses;

    // 4. GROUP BY DATE FOR CHARTS
    const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
    const dailyCashFlow: DailyCashFlow[] = dateRange.map((date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // Sum receivables for this date
      const dayReceivables = receivables
        .filter((item) => format(item.date, 'yyyy-MM-dd') === dateStr)
        .reduce((sum, item) => sum + item.amount, 0);
      
      // Sum expenses for this date
      const dayExpenses = expenses
        .filter((item) => format(item.date, 'yyyy-MM-dd') === dateStr)
        .reduce((sum, item) => sum + item.amount, 0);
      
      return {
        date: dateStr,
        receivables: dayReceivables,
        expenses: dayExpenses,
        netFlow: dayReceivables - dayExpenses,
      };
    });

    // 5. CATEGORY BREAKDOWN FOR EXPENSES
    const expensesByCategory = expenses.reduce((acc, expense) => {
      const category = expense.customCategory || expense.category;
      if (!acc[category]) {
        acc[category] = 0;
      }
      acc[category] += expense.amount;
      return acc;
    }, {} as Record<string, number>);

    // 6. PAYMENT METHOD BREAKDOWN FOR RECEIVABLES
    const receivablesByMethod = receivables.reduce((acc, receivable) => {
      const method = receivable.paymentMethod;
      if (!acc[method]) {
        acc[method] = 0;
      }
      acc[method] += receivable.amount;
      return acc;
    }, {} as Record<string, number>);

    // 7. PAYMENT ANALYSIS - À VISTA VS PARCELADO
    // Fetch all sales in the period with their payment splits
    const salesInPeriod = await prisma.sale.findMany({
      where: {
        workspaceId: workspace.id,
        saleDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        paymentSplits: true,
      },
    });

    // Calculate totals and breakdowns
    let totalCashPayments = 0; // À vista (installments = 1)
    let totalInstallmentPayments = 0; // Parcelado (installments > 1)
    
    const paymentMethodBreakdown: Record<string, { cash: number; installment: number; total: number }> = {};

    salesInPeriod.forEach((sale) => {
      sale.paymentSplits.forEach((split) => {
        const method = formatPaymentMethod(split.paymentMethod);
        const isCash = split.installments === 1;
        
        // Initialize method breakdown if doesn't exist
        if (!paymentMethodBreakdown[method]) {
          paymentMethodBreakdown[method] = { cash: 0, installment: 0, total: 0 };
        }

        // Add to totals
        if (isCash) {
          totalCashPayments += split.amount;
          paymentMethodBreakdown[method].cash += split.amount;
        } else {
          totalInstallmentPayments += split.amount;
          paymentMethodBreakdown[method].installment += split.amount;
        }
        
        paymentMethodBreakdown[method].total += split.amount;
      });
    });

    const totalPayments = totalCashPayments + totalInstallmentPayments;
    const cashPercentage = totalPayments > 0 ? (totalCashPayments / totalPayments) * 100 : 0;
    const installmentPercentage = totalPayments > 0 ? (totalInstallmentPayments / totalPayments) * 100 : 0;

    return NextResponse.json({
      summary: {
        totalReceivables,
        totalExpenses,
        netCashFlow,
        period: {
          start: format(startDate, 'yyyy-MM-dd'),
          end: format(endDate, 'yyyy-MM-dd'),
        },
      },
      receivables,
      expenses,
      dailyCashFlow,
      breakdowns: {
        expensesByCategory,
        receivablesByMethod,
      },
      paymentAnalysis: {
        totalPayments,
        cashPayments: {
          amount: totalCashPayments,
          percentage: cashPercentage,
        },
        installmentPayments: {
          amount: totalInstallmentPayments,
          percentage: installmentPercentage,
        },
        byPaymentMethod: paymentMethodBreakdown,
      },
    });
  } catch (error) {
    console.error('Error fetching cash flow data:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar dados de fluxo de caixa' },
      { status: 500 }
    );
  }
}

// Helper function to format payment method
function formatPaymentMethod(method: string): string {
  const methods: Record<string, string> = {
    CASH_PIX: 'Dinheiro/Pix',
    CREDIT_CARD: 'Cartão de Crédito',
    DEBIT_CARD: 'Cartão de Débito',
    BANK_SLIP: 'Boleto',
  };
  return methods[method] || method;
}

// Helper function to format cost category
function formatCostCategory(category: string): string {
  const categories: Record<string, string> = {
    OPERATIONAL: 'Operacional',
    TAX: 'Impostos',
    COMMISSION: 'Comissões',
    CARD: 'Cartão',
    CUSTOM: 'Personalizado',
  };
  return categories[category] || category;
}
