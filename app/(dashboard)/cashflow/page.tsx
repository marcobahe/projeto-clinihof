'use client';

import { useState, useEffect } from 'react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  ArrowUpCircle,
  ArrowDownCircle,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useCountUp } from '@/hooks/use-count-up';

interface ReceivableItem {
  id: string;
  date: string;
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
  date: string;
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

interface CashFlowData {
  summary: {
    totalReceivables: number;
    totalExpenses: number;
    netCashFlow: number;
    period: {
      start: string;
      end: string;
    };
  };
  receivables: ReceivableItem[];
  expenses: ExpenseItem[];
  dailyCashFlow: DailyCashFlow[];
  breakdowns: {
    expensesByCategory: Record<string, number>;
    receivablesByMethod: Record<string, number>;
  };
  paymentAnalysis: {
    totalPayments: number;
    cashPayments: {
      amount: number;
      percentage: number;
    };
    installmentPayments: {
      amount: number;
      percentage: number;
    };
    byPaymentMethod: Record<string, { cash: number; installment: number; total: number }>;
  };
}

// Animated currency component
function AnimatedCurrency({ value }: { value: number }) {
  const animatedValue = useCountUp(value, 2000);
  return (
    <span>
      {formatCurrency(animatedValue)}
    </span>
  );
}

const COLORS = {
  purple: ['#9333ea', '#a855f7', '#c084fc', '#d8b4fe', '#e9d5ff', '#f3e8ff'],
  green: ['#10b981', '#34d399', '#6ee7b7'],
  red: ['#ef4444', '#f87171', '#fca5a5'],
  blue: ['#3b82f6', '#60a5fa', '#93c5fd'],
};

export default function CashFlowPage() {
  // Date range state - default to current month
  const [startDate, setStartDate] = useState<string>(
    format(startOfMonth(new Date()), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState<string>(
    format(endOfMonth(new Date()), 'yyyy-MM-dd')
  );

  const [data, setData] = useState<CashFlowData | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch data whenever date range changes
  useEffect(() => {
    fetchCashFlowData();
  }, [startDate, endDate]);

  const fetchCashFlowData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/cashflow?startDate=${startDate}&endDate=${endDate}`
      );

      if (!response.ok) {
        throw new Error('Erro ao carregar dados');
      }

      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching cash flow:', error);
      toast.error('Erro ao carregar dados do fluxo de caixa');
    } finally {
      setLoading(false);
    }
  };

  // Quick date range presets
  const setQuickRange = (preset: string) => {
    const now = new Date();
    let start: Date, end: Date;

    switch (preset) {
      case 'thisMonth':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'last30':
        start = subDays(now, 30);
        end = now;
        break;
      case 'last60':
        start = subDays(now, 60);
        end = now;
        break;
      case 'last90':
        start = subDays(now, 90);
        end = now;
        break;
      default:
        return;
    }

    setStartDate(format(start, 'yyyy-MM-dd'));
    setEndDate(format(end, 'yyyy-MM-dd'));
  };

  // Prepare chart data
  const chartData = data?.dailyCashFlow.map((day) => ({
    date: format(new Date(day.date), 'dd/MM', { locale: ptBR }),
    'Recebíveis': day.receivables,
    'Despesas': day.expenses,
    'Saldo': day.netFlow,
  })) || [];

  // Prepare expense breakdown for pie chart
  const expenseChartData = Object.entries(data?.breakdowns.expensesByCategory || {}).map(
    ([category, value]) => ({
      name: category,
      value: value,
    })
  );

  // Prepare receivables breakdown for pie chart
  const receivablesChartData = Object.entries(data?.breakdowns.receivablesByMethod || {}).map(
    ([method, value]) => ({
      name: method,
      value: value,
    })
  );

  // Calculate health indicator
  const getHealthStatus = () => {
    if (!data) return { text: 'Carregando...', color: 'text-gray-500 dark:text-gray-400', icon: Clock };
    
    const ratio = data.summary.netCashFlow / data.summary.totalReceivables;
    
    if (data.summary.netCashFlow > 0 && ratio > 0.3) {
      return { text: 'Saudável', color: 'text-green-600', icon: CheckCircle };
    } else if (data.summary.netCashFlow > 0) {
      return { text: 'Atenção', color: 'text-amber-600', icon: AlertCircle };
    } else {
      return { text: 'Crítico', color: 'text-red-600', icon: AlertCircle };
    }
  };

  const healthStatus = getHealthStatus();
  const HealthIcon = healthStatus.icon;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Fluxo de Caixa</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Análise completa de recebíveis e despesas
          </p>
        </div>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Período de Análise
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Data Início
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Data Fim
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => setQuickRange('thisMonth')}
                variant="outline"
                size="sm"
              >
                Este Mês
              </Button>
              <Button
                onClick={() => setQuickRange('last30')}
                variant="outline"
                size="sm"
              >
                30 dias
              </Button>
              <Button
                onClick={() => setQuickRange('last60')}
                variant="outline"
                size="sm"
              >
                60 dias
              </Button>
              <Button
                onClick={() => setQuickRange('last90')}
                variant="outline"
                size="sm"
              >
                90 dias
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-500 dark:text-gray-400">Carregando dados...</p>
          </div>
        </div>
      ) : data ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Total Receivables */}
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      Total a Receber
                    </p>
                    <p className="text-2xl font-bold text-green-900 mt-2">
                      <AnimatedCurrency value={data.summary.totalReceivables} />
                    </p>
                  </div>
                  <div className="p-3 bg-green-200 rounded-full">
                    <ArrowUpCircle className="h-6 w-6 text-green-700" />
                  </div>
                </div>
                <p className="text-xs text-green-700 mt-2">
                  {data.receivables.length} recebíveis
                </p>
              </CardContent>
            </Card>

            {/* Total Expenses */}
            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-800">
                      Total de Despesas
                    </p>
                    <p className="text-2xl font-bold text-red-900 mt-2">
                      <AnimatedCurrency value={data.summary.totalExpenses} />
                    </p>
                  </div>
                  <div className="p-3 bg-red-200 rounded-full">
                    <ArrowDownCircle className="h-6 w-6 text-red-700" />
                  </div>
                </div>
                <p className="text-xs text-red-700 mt-2">
                  {data.expenses.length} despesas
                </p>
              </CardContent>
            </Card>

            {/* Net Cash Flow */}
            <Card
              className={`bg-gradient-to-br ${
                data.summary.netCashFlow >= 0
                  ? 'from-purple-50 to-purple-100 border-purple-200'
                  : 'from-orange-50 to-orange-100 border-orange-200'
              }`}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p
                      className={`text-sm font-medium ${
                        data.summary.netCashFlow >= 0
                          ? 'text-purple-800'
                          : 'text-orange-800'
                      }`}
                    >
                      Saldo Líquido
                    </p>
                    <p
                      className={`text-2xl font-bold mt-2 ${
                        data.summary.netCashFlow >= 0
                          ? 'text-purple-900'
                          : 'text-orange-900'
                      }`}
                    >
                      <AnimatedCurrency value={data.summary.netCashFlow} />
                    </p>
                  </div>
                  <div
                    className={`p-3 rounded-full ${
                      data.summary.netCashFlow >= 0
                        ? 'bg-purple-200'
                        : 'bg-orange-200'
                    }`}
                  >
                    {data.summary.netCashFlow >= 0 ? (
                      <TrendingUp
                        className={`h-6 w-6 ${
                          data.summary.netCashFlow >= 0
                            ? 'text-purple-700'
                            : 'text-orange-700'
                        }`}
                      />
                    ) : (
                      <TrendingDown className="h-6 w-6 text-orange-700" />
                    )}
                  </div>
                </div>
                <p
                  className={`text-xs mt-2 ${
                    data.summary.netCashFlow >= 0
                      ? 'text-purple-700'
                      : 'text-orange-700'
                  }`}
                >
                  Recebíveis - Despesas
                </p>
              </CardContent>
            </Card>

            {/* Health Status */}
            <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 dark:border-gray-700">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      Saúde Financeira
                    </p>
                    <p className={`text-2xl font-bold mt-2 ${healthStatus.color}`}>
                      {healthStatus.text}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-200 dark:bg-gray-700 rounded-full">
                    <HealthIcon className={`h-6 w-6 ${healthStatus.color}`} />
                  </div>
                </div>
                <p className="text-xs text-gray-700 dark:text-gray-300 mt-2">
                  Baseado no período selecionado
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Line Chart - Daily Cash Flow */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Evolução Diária do Fluxo de Caixa</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250} className="text-xs sm:text-sm">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number) =>
                        formatCurrency(value)
                      }
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="Recebíveis"
                      stroke={COLORS.green[0]}
                      strokeWidth={2}
                      dot={{ fill: COLORS.green[0], r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Despesas"
                      stroke={COLORS.red[0]}
                      strokeWidth={2}
                      dot={{ fill: COLORS.red[0], r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Saldo"
                      stroke={COLORS.purple[0]}
                      strokeWidth={3}
                      dot={{ fill: COLORS.purple[0], r: 5 }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Bar Chart - Receivables vs Expenses */}
            <Card>
              <CardHeader>
                <CardTitle>Comparação: Recebíveis vs Despesas</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250} className="text-xs sm:text-sm">
                  <BarChart
                    data={[
                      {
                        name: 'Total',
                        Recebíveis: data.summary.totalReceivables,
                        Despesas: data.summary.totalExpenses,
                      },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number) =>
                        formatCurrency(value)
                      }
                    />
                    <Legend />
                    <Bar dataKey="Recebíveis" fill={COLORS.green[0]} radius={[8, 8, 0, 0]} />
                    <Bar dataKey="Despesas" fill={COLORS.red[0]} radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Pie Chart - Expense Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Despesas por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                {expenseChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250} className="text-xs sm:text-sm">
                    <PieChart>
                      <Pie
                        data={expenseChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) =>
                          `${entry.name}: ${formatCurrency(entry.value)}`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {expenseChartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS.purple[index % COLORS.purple.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) =>
                          formatCurrency(value)
                        }
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
                    Nenhuma despesa no período
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Payment Analysis Section - À Vista vs Parcelado */}
          {data.paymentAnalysis && (
            <>
              <div className="mt-8">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  Análise de Pagamentos
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  Distribuição de faturamento por tipo de pagamento e forma
                </p>
              </div>

              {/* Summary Cards - À Vista vs Parcelado */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Faturamento */}
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
                          Faturamento Total
                        </p>
                        <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 mt-2">
                          <AnimatedCurrency value={data.paymentAnalysis.totalPayments} />
                        </p>
                      </div>
                      <div className="p-3 bg-purple-200 dark:bg-purple-700 rounded-full">
                        <DollarSign className="h-6 w-6 text-purple-600 dark:text-purple-200" />
                      </div>
                    </div>
                    <p className="text-xs text-purple-700 dark:text-purple-300 mt-2">
                      Vendas no período selecionado
                    </p>
                  </CardContent>
                </Card>

                {/* Pagamentos à Vista */}
                <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-800 dark:text-green-200">
                          Pagamentos à Vista
                        </p>
                        <p className="text-2xl font-bold text-green-900 dark:text-green-100 mt-2">
                          <AnimatedCurrency value={data.paymentAnalysis.cashPayments.amount} />
                        </p>
                      </div>
                      <div className="p-3 bg-green-200 dark:bg-green-700 rounded-full">
                        <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-200" />
                      </div>
                    </div>
                    <p className="text-xs text-green-700 dark:text-green-300 mt-2">
                      {formatNumber(data.paymentAnalysis.cashPayments.percentage, 1)}% do faturamento
                    </p>
                  </CardContent>
                </Card>

                {/* Pagamentos Parcelados */}
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                          Pagamentos Parcelados
                        </p>
                        <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-2">
                          <AnimatedCurrency value={data.paymentAnalysis.installmentPayments.amount} />
                        </p>
                      </div>
                      <div className="p-3 bg-blue-200 dark:bg-blue-700 rounded-full">
                        <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-200" />
                      </div>
                    </div>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                      {formatNumber(data.paymentAnalysis.installmentPayments.percentage, 1)}% do faturamento
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts - Payment Analysis */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pie Chart - À Vista vs Parcelado */}
                <Card>
                  <CardHeader>
                    <CardTitle>Distribuição: À Vista vs Parcelado</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.paymentAnalysis.totalPayments > 0 ? (
                      <ResponsiveContainer width="100%" height={300} className="text-xs sm:text-sm">
                        <PieChart>
                          <Pie
                            data={[
                              {
                                name: 'À Vista',
                                value: data.paymentAnalysis.cashPayments.amount,
                              },
                              {
                                name: 'Parcelado',
                                value: data.paymentAnalysis.installmentPayments.amount,
                              },
                            ]}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={(entry) =>
                              `${entry.name}: ${formatNumber((entry.value / data.paymentAnalysis.totalPayments) * 100, 1)}%`
                            }
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            <Cell fill={COLORS.green[0]} />
                            <Cell fill={COLORS.blue[0]} />
                          </Pie>
                          <Tooltip
                            formatter={(value: number) =>
                              formatCurrency(value)
                            }
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
                        Nenhum pagamento no período
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Stacked Bar Chart - Payment Methods Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle>Formas de Pagamento: À Vista vs Parcelado</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {Object.keys(data.paymentAnalysis.byPaymentMethod).length > 0 ? (
                      <ResponsiveContainer width="100%" height={300} className="text-xs sm:text-sm">
                        <BarChart
                          data={Object.entries(data.paymentAnalysis.byPaymentMethod).map(
                            ([method, values]) => ({
                              method,
                              'À Vista': values.cash,
                              'Parcelado': values.installment,
                            })
                          )}
                          layout="vertical"
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="method" type="category" width={120} />
                          <Tooltip
                            formatter={(value: number) =>
                              formatCurrency(value)
                            }
                          />
                          <Legend />
                          <Bar dataKey="À Vista" stackId="a" fill={COLORS.green[0]} />
                          <Bar dataKey="Parcelado" stackId="a" fill={COLORS.blue[0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
                        Nenhum pagamento no período
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Payment Method Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Detalhamento por Forma de Pagamento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">
                            Forma de Pagamento
                          </th>
                          <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">
                            À Vista
                          </th>
                          <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">
                            Parcelado
                          </th>
                          <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">
                            Total
                          </th>
                          <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">
                            % do Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {Object.entries(data.paymentAnalysis.byPaymentMethod).map(
                          ([method, values]) => {
                            const percentage =
                              (values.total / data.paymentAnalysis.totalPayments) * 100;
                            return (
                              <tr key={method} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                                  {method}
                                </td>
                                <td className="px-4 py-3 text-right text-green-700 dark:text-green-400">
                                  {formatCurrency(values.cash)}
                                </td>
                                <td className="px-4 py-3 text-right text-blue-700 dark:text-blue-400">
                                  {formatCurrency(values.installment)}
                                </td>
                                <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">
                                  {formatCurrency(values.total)}
                                </td>
                                <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                                  {formatNumber(percentage, 1)}%
                                </td>
                              </tr>
                            );
                          }
                        )}
                      </tbody>
                      <tfoot className="bg-gray-50 dark:bg-gray-800 font-bold">
                        <tr>
                          <td className="px-4 py-3 text-gray-900 dark:text-gray-100">Total</td>
                          <td className="px-4 py-3 text-right text-green-700 dark:text-green-400">
                            {formatCurrency(data.paymentAnalysis.cashPayments.amount)}
                          </td>
                          <td className="px-4 py-3 text-right text-blue-700 dark:text-blue-400">
                            {formatCurrency(data.paymentAnalysis.installmentPayments.amount)}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100">
                            {formatCurrency(data.paymentAnalysis.totalPayments)}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                            100%
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Detailed Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Receivables Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowUpCircle className="h-5 w-5 text-green-600" />
                  Recebíveis Detalhados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto max-h-[500px]">
                  {data.receivables.length > 0 ? (
                    <div className="overflow-x-auto"><table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
                            Data
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
                            Paciente
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
                            Método
                          </th>
                          <th className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-300">
                            Valor
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {data.receivables.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50 dark:bg-gray-800">
                            <td className="px-3 py-2 text-gray-900 dark:text-gray-100">
                              {format(new Date(item.date), 'dd/MM/yyyy', {
                                locale: ptBR,
                              })}
                            </td>
                            <td className="px-3 py-2 text-gray-900 dark:text-gray-100">
                              {item.patientName}
                            </td>
                            <td className="px-3 py-2">
                              <div className="text-gray-700 dark:text-gray-300">
                                {item.paymentMethod}
                              </div>
                              {item.totalInstallments > 1 && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {item.installmentNumber}/{item.totalInstallments}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right font-medium text-green-700">
                              {formatCurrency(item.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 dark:bg-gray-800 sticky bottom-0">
                        <tr>
                          <td colSpan={3} className="px-3 py-2 font-bold text-gray-900 dark:text-gray-100">
                            Total
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-green-700">
                            {formatCurrency(data.summary.totalReceivables)}
                          </td>
                        </tr>
                      </tfoot>
                    </table></div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      Nenhum recebível no período selecionado
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Expenses Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowDownCircle className="h-5 w-5 text-red-600" />
                  Despesas Detalhadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto max-h-[500px]">
                  {data.expenses.length > 0 ? (
                    <div className="overflow-x-auto"><table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
                            Data
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
                            Descrição
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
                            Categoria
                          </th>
                          <th className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-300">
                            Valor
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {data.expenses.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50 dark:bg-gray-800">
                            <td className="px-3 py-2 text-gray-900 dark:text-gray-100">
                              {format(new Date(item.date), 'dd/MM/yyyy', {
                                locale: ptBR,
                              })}
                            </td>
                            <td className="px-3 py-2 text-gray-900 dark:text-gray-100">
                              {item.description}
                            </td>
                            <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                              {item.customCategory || item.category}
                            </td>
                            <td className="px-3 py-2 text-right font-medium text-red-700">
                              {formatCurrency(item.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 dark:bg-gray-800 sticky bottom-0">
                        <tr>
                          <td colSpan={3} className="px-3 py-2 font-bold text-gray-900 dark:text-gray-100">
                            Total
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-red-700">
                            {formatCurrency(data.summary.totalExpenses)}
                          </td>
                        </tr>
                      </tfoot>
                    </table></div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      Nenhuma despesa no período selecionado
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Financial Insights */}
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardHeader>
              <CardTitle className="text-purple-900">Insights Financeiros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-900 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Média Diária de Recebíveis</p>
                  <p className="text-xl font-bold text-purple-700">
                    {formatCurrency(data.summary.totalReceivables / data.dailyCashFlow.length)}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-900 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Média Diária de Despesas</p>
                  <p className="text-xl font-bold text-purple-700">
                    {formatCurrency(data.summary.totalExpenses / data.dailyCashFlow.length)}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-900 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Margem de Lucro</p>
                  <p className="text-xl font-bold text-purple-700">
                    {
                      formatNumber((data.summary.netCashFlow / data.summary.totalReceivables) * 100, 1)
                    }%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          Selecione um período para visualizar os dados
        </div>
      )}
    </div>
  );
}
