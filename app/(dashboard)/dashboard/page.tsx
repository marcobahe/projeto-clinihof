'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format as formatDate } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { motion, AnimatePresence } from 'framer-motion';
import { useCountUp } from '@/hooks/use-count-up';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  Briefcase,
  Package,
  Users,
  Filter,
  Target,
  FileText,
  UserPlus,
  Receipt,
  ArrowUpRight,
} from 'lucide-react';
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
import { OriginStatsWidget } from '@/components/dashboard/origin-stats-widget';
import { BirthdayWidget } from '@/components/dashboard/birthday-widget';

interface DashboardStats {
  financial: {
    grossRevenue: number;
    netRevenue: number;
    totalDeductions: number;
    breakdown: {
      supplyCosts: number;
      laborCosts: number;
      taxesAndFees: number;
      cardFees: number;
    };
  };
  operations: {
    completedSales: number;
    totalSales: number;
    completedSessions: number;
    pendingSessions: number;
    totalSessions: number;
  };
  conversion: {
    totalQuotes: number;
    convertedQuotes: number;
    conversionRate: number;
    quotesByStatus: Record<string, number>;
  };
  receivables: {
    next30Days: number;
    next60Days: number;
    next90Days: number;
    total: number;
    count: number;
  };
  patients: {
    newPatients: number;
    totalPatients: number;
    newPatientRate: number;
  };
  charts: {
    revenueTrend: Array<{ month: string; revenue: number }>;
    paymentMethods: Array<{ method: string; amount: number }>;
    sessionStatus: Array<{ status: string; count: number }>;
  };
  topProcedures: Array<{ name: string; count: number; revenue: number }>;
  professionalCosts: Array<{ role: string; hourlyCost: number; professionals: number }>;
}

const COLORS = ['#9333ea', '#a855f7', '#c084fc', '#d8b4fe', '#e9d5ff'];

const paymentMethodLabels: Record<string, string> = {
  CASH_PIX: 'Dinheiro/Pix',
  CREDIT_CARD: 'Cartão de Crédito',
  DEBIT_CARD: 'Cartão de Débito',
  BANK_SLIP: 'Boleto',
};

// Animated Number Component
function AnimatedNumber({ value, decimals = 0, prefix = '', suffix = '' }: { value: number; decimals?: number; prefix?: string; suffix?: string }) {
  const animatedValue = useCountUp(value, 2000, decimals);
  
  return (
    <span>
      {prefix}{formatNumber(animatedValue, decimals)}{suffix}
    </span>
  );
}

// Animated Currency Component
function AnimatedCurrency({ value }: { value: number }) {
  const animatedValue = useCountUp(value, 2000, 2);
  
  return (
    <span>
      {formatCurrency(animatedValue)}
    </span>
  );
}

export default function DashboardPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session && period !== 'custom') {
      fetchStats();
    }
  }, [session, period]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Build query params
      let queryString = `period=${period}`;
      if (period === 'custom' && dateRange?.from && dateRange?.to) {
        queryString += `&startDate=${dateRange.from.toISOString()}&endDate=${dateRange.to.toISOString()}`;
      }
      
      const response = await fetch(`/api/stats/dashboard?${queryString}`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const periodLabels: Record<string, string> = {
    today: 'Hoje',
    week: 'Esta Semana',
    last7days: 'Últimos 7 Dias',
    last15days: 'Últimos 15 Dias',
    last30days: 'Últimos 30 Dias',
    month: 'Este Mês',
    custom: 'Período Personalizado',
  };

  if (status === 'loading' || loading) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-3 animate-pulse"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-96 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
              </div>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6"></div>
                <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-8">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">Erro ao carregar estatísticas. Tente novamente.</p>
      </div>
    );
  }

  const profitMargin = stats.financial.grossRevenue > 0
    ? (stats.financial.netRevenue / stats.financial.grossRevenue) * 100
    : 0;

  const completionRate = stats.operations.totalSessions > 0
    ? (stats.operations.completedSessions / stats.operations.totalSessions) * 100
    : 0;

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">Dashboard Executivo</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Análise completa do desempenho da sua clínica</p>
          </div>
          
          {/* Period Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-500" />
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Esta Semana</SelectItem>
                <SelectItem value="last7days">Últimos 7 Dias</SelectItem>
                <SelectItem value="last15days">Últimos 15 Dias</SelectItem>
                <SelectItem value="last30days">Últimos 30 Dias</SelectItem>
                <SelectItem value="month">Este Mês</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Custom Date Range Picker */}
        {period === 'custom' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4"
          >
            <div className="flex items-center gap-2">
              <input
                type="date"
                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                onChange={(e) => {
                  const newDate = e.target.value ? new Date(e.target.value) : undefined;
                  setDateRange(prev => {
                    if (!prev) return { from: newDate, to: undefined };
                    return { ...prev, from: newDate };
                  });
                }}
              />
              <span className="text-gray-500">até</span>
              <input
                type="date"
                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                onChange={(e) => {
                  const newDate = e.target.value ? new Date(e.target.value) : undefined;
                  setDateRange(prev => {
                    if (!prev) return { from: undefined, to: newDate };
                    return { ...prev, to: newDate };
                  });
                }}
              />
              <Button 
                onClick={() => {
                  if (dateRange?.from && dateRange?.to) {
                    fetchStats();
                  }
                }}
                disabled={!dateRange?.from || !dateRange?.to}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Aplicar
              </Button>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="p-6 bg-gradient-to-br from-purple-600 to-purple-700 text-white shadow-lg">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-purple-100 text-sm font-medium">Faturamento Bruto</p>
                <p className="text-sm text-purple-200 mt-1">Mês atual</p>
              </div>
              <div className="bg-purple-500/50 p-3 rounded-lg">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
            <p className="text-3xl font-bold">
              <AnimatedCurrency value={stats.financial.grossRevenue} />
            </p>
            <div className="flex items-center mt-3 text-sm">
              <TrendingUp className="h-4 w-4 mr-1" />
              <span className="text-purple-100">Total de vendas no período</span>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="p-6 bg-gradient-to-br from-purple-700 to-purple-800 text-white shadow-lg">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-purple-100 text-sm font-medium">Faturamento Líquido</p>
                <p className="text-sm text-purple-200 mt-1">Após deduções</p>
              </div>
              <div className="bg-purple-600/50 p-3 rounded-lg">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
            <p className="text-3xl font-bold">
              <AnimatedCurrency value={stats.financial.netRevenue} />
            </p>
            <div className="flex items-center mt-3 text-sm">
              <span className="text-purple-100">Margem de <AnimatedNumber value={profitMargin} decimals={1} suffix="%" /></span>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-purple-100 text-sm font-medium">Total de Deduções</p>
                <p className="text-sm text-purple-200 mt-1">Custos operacionais</p>
              </div>
              <div className="bg-purple-400/50 p-3 rounded-lg">
                <TrendingDown className="h-6 w-6" />
              </div>
            </div>
            <p className="text-3xl font-bold">
              <AnimatedCurrency value={stats.financial.totalDeductions} />
            </p>
            <div className="flex items-center mt-3 text-sm">
              <span className="text-purple-100">
                <AnimatedNumber 
                  value={stats.financial.grossRevenue > 0
                    ? (stats.financial.totalDeductions / stats.financial.grossRevenue) * 100
                    : 0} 
                  decimals={1} 
                  suffix="% do faturamento"
                />
              </span>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="p-6 bg-gradient-to-br from-purple-400 to-purple-500 text-white shadow-lg">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-purple-100 text-sm font-medium">Vendas Concluídas</p>
                <p className="text-sm text-purple-200 mt-1">Atendimentos finalizados</p>
              </div>
              <div className="bg-purple-300/50 p-3 rounded-lg">
                <CheckCircle className="h-6 w-6" />
              </div>
            </div>
            <p className="text-3xl font-bold">
              <AnimatedNumber value={stats.operations.completedSales} />/<AnimatedNumber value={stats.operations.totalSales} />
            </p>
            <div className="flex items-center mt-3 text-sm">
              <span className="text-purple-100">
                <AnimatedNumber 
                  value={stats.operations.totalSales > 0
                    ? (stats.operations.completedSales / stats.operations.totalSales) * 100
                    : 0} 
                  decimals={0} 
                  suffix="% de conclusão"
                />
              </span>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Deductions Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="mb-8"
      >
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <Briefcase className="h-5 w-5 mr-2 text-purple-600" />
            Detalhamento de Custos e Deduções
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="flex items-center">
                <Package className="h-5 w-5 text-purple-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Insumos</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    <AnimatedCurrency value={stats.financial.breakdown.supplyCosts} />
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="flex items-center">
                <Users className="h-5 w-5 text-purple-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Mão de Obra</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    <AnimatedCurrency value={stats.financial.breakdown.laborCosts} />
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="flex items-center">
                <Receipt className="h-5 w-5 text-purple-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Impostos</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    <AnimatedCurrency value={stats.financial.breakdown.taxesAndFees} />
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border-2 border-orange-200 dark:border-orange-800">
              <div className="flex items-center">
                <CreditCard className="h-5 w-5 text-orange-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Taxas Cartão</p>
                  <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                    <AnimatedCurrency value={stats.financial.breakdown.cardFees} />
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <AnimatedNumber 
                      value={stats.financial.grossRevenue > 0
                        ? (stats.financial.breakdown.cardFees / stats.financial.grossRevenue) * 100
                        : 0} 
                      decimals={2} 
                      suffix="% do bruto"
                    />
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* NEW: Conversion, Receivables, and Growth Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
        {/* Conversion Rate */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.55 }}
        >
          <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-2 border-green-200 dark:border-green-800">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-green-800 dark:text-green-300 text-sm font-medium flex items-center">
                  <Target className="h-4 w-4 mr-2" />
                  Taxa de Conversão
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">Orçamentos → Vendas</p>
              </div>
            </div>
            <p className="text-4xl font-bold text-green-700 dark:text-green-300 mb-2">
              <AnimatedNumber value={stats.conversion.conversionRate} decimals={1} suffix="%" />
            </p>
            <div className="flex items-center justify-between text-sm mt-3">
              <span className="text-green-600 dark:text-green-400">
                <AnimatedNumber value={stats.conversion.convertedQuotes} /> de <AnimatedNumber value={stats.conversion.totalQuotes} /> orçamentos
              </span>
            </div>
            <div className="mt-3 bg-green-200 dark:bg-green-800/30 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${formatNumber(stats.conversion.conversionRate, 1)}%` }}
              ></div>
            </div>
          </Card>
        </motion.div>

        {/* Future Receivables */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-2 border-blue-200 dark:border-blue-800">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-blue-800 dark:text-blue-300 text-sm font-medium flex items-center">
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  A Receber (30 dias)
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{stats.receivables.count} parcelas pendentes</p>
              </div>
            </div>
            <p className="text-3xl font-bold text-blue-700 dark:text-blue-300 mb-2">
              <AnimatedCurrency value={stats.receivables.next30Days} />
            </p>
            <div className="space-y-1 text-xs text-blue-600 dark:text-blue-400 mt-3">
              <div className="flex justify-between">
                <span>60 dias:</span>
                <span className="font-semibold">{formatCurrency(stats.receivables.next60Days)}</span>
              </div>
              <div className="flex justify-between">
                <span>90 dias:</span>
                <span className="font-semibold">{formatCurrency(stats.receivables.next90Days)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-blue-300 dark:border-blue-700">
                <span className="font-semibold">Total:</span>
                <span className="font-bold">{formatCurrency(stats.receivables.total)}</span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* New Patients */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.65 }}
        >
          <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-2 border-purple-200 dark:border-purple-800">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-purple-800 dark:text-purple-300 text-sm font-medium flex items-center">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Novos Pacientes
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Crescimento no período</p>
              </div>
            </div>
            <p className="text-4xl font-bold text-purple-700 dark:text-purple-300 mb-2">
              <AnimatedNumber value={stats.patients.newPatients} />
            </p>
            <div className="flex items-center justify-between text-sm mt-3">
              <span className="text-purple-600 dark:text-purple-400">
                Total: <AnimatedNumber value={stats.patients.totalPatients} /> pacientes
              </span>
            </div>
            <div className="mt-3 bg-purple-200 dark:bg-purple-800/30 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${formatNumber(stats.patients.newPatientRate, 1)}%` }}
              ></div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Operational Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Card className="p-6 border-l-4 border-purple-600">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Sessões Concluídas</p>
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              <AnimatedNumber value={stats.operations.completedSessions} />
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">De <AnimatedNumber value={stats.operations.totalSessions} /> sessões</span>
              <span className="text-purple-600 font-semibold"><AnimatedNumber value={completionRate} decimals={1} suffix="%" /></span>
            </div>
            <div className="mt-3 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${formatNumber(completionRate, 1)}%` }}
              ></div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <Card className="p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Sessões Pendentes</p>
              <Clock className="h-5 w-5 text-orange-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              <AnimatedNumber value={stats.operations.pendingSessions} />
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Aguardando realização</span>
              <span className="text-orange-600 font-semibold">
                <AnimatedNumber 
                  value={stats.operations.totalSessions > 0
                    ? (stats.operations.pendingSessions / stats.operations.totalSessions) * 100
                    : 0} 
                  decimals={0} 
                  suffix="%"
                />
              </span>
            </div>
            <div className="mt-3 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-orange-500 h-2 rounded-full transition-all duration-1000"
                style={{
                  width: `${
                    stats.operations.totalSessions > 0
                      ? (stats.operations.pendingSessions / stats.operations.totalSessions) * 100
                      : 0
                  }%`,
                }}
              ></div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <Card className="p-6 border-l-4 border-purple-400">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total de Sessões</p>
              <Calendar className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              <AnimatedNumber value={stats.operations.totalSessions} />
            </p>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Em <AnimatedNumber value={stats.operations.totalSales} /> vendas realizadas
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.9 }}
        >
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Evolução de Faturamento</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.charts.revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#9333ea"
                  strokeWidth={3}
                  dot={{ fill: '#9333ea', r: 5 }}
                  activeDot={{ r: 7 }}
                  animationBegin={400}
                  animationDuration={2000}
                  animationEasing="ease-in-out"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 1.0 }}
        >
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Formas de Pagamento</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.charts.paymentMethods}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="method"
                  stroke="#6b7280"
                  tickFormatter={(value) => paymentMethodLabels[value] || value}
                />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => paymentMethodLabels[label] || label}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Bar 
                  dataKey="amount" 
                  fill="#9333ea" 
                  radius={[8, 8, 0, 0]}
                  animationBegin={400}
                  animationDuration={2000}
                  animationEasing="ease-in-out"
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 1.1 }}
        >
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Status das Sessões</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.charts.sessionStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ status, count, percent }) =>
                    `${status}: ${count} (${formatNumber(percent * 100, 0)}%)`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                  animationBegin={400}
                  animationDuration={2000}
                  animationEasing="ease-in-out"
                >
                  {stats.charts.sessionStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 1.2 }}
        >
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Resumo do Período</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mr-3"></div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Ticket Médio</span>
                </div>
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  <AnimatedCurrency 
                    value={stats.operations.totalSales > 0
                      ? stats.financial.grossRevenue / stats.operations.totalSales
                      : 0}
                  />
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mr-3"></div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Margem de Lucro</span>
                </div>
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  <AnimatedNumber value={profitMargin} decimals={1} suffix="%" />
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mr-3"></div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Taxa de Conclusão</span>
                </div>
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  <AnimatedNumber value={completionRate} decimals={1} suffix="%" />
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mr-3"></div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Custo Operacional</span>
                </div>
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  <AnimatedNumber 
                    value={stats.financial.grossRevenue > 0
                      ? (stats.financial.totalDeductions / stats.financial.grossRevenue) * 100
                      : 0}
                    decimals={1}
                    suffix="%"
                  />
                </span>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* New sections: Top Procedures and Professional Costs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 1.3 }}
        >
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-purple-600" />
              Procedimentos Mais Vendidos
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Top 5 no mês atual</p>
            {stats.topProcedures && stats.topProcedures.length > 0 ? (
              <div className="space-y-3">
                {stats.topProcedures.map((proc, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-white rounded-lg border border-purple-100 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center flex-1">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-600 text-white font-bold text-sm mr-3">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{proc.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          <AnimatedNumber value={proc.count} /> {proc.count === 1 ? 'venda' : 'vendas'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-purple-600">
                        <AnimatedCurrency value={proc.revenue} />
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">receita</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>Nenhum procedimento vendido neste mês</p>
              </div>
            )}
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 1.4 }}
        >
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2 text-purple-600" />
              Custo por Hora - Profissionais
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Custo médio por tipo de profissional</p>
            {stats.professionalCosts && stats.professionalCosts.length > 0 ? (
              <div className="space-y-3">
                {stats.professionalCosts.map((prof, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-white rounded-lg border border-purple-100 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center flex-1">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-600 text-white mr-3">
                        <Briefcase className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{prof.role}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          <AnimatedNumber value={prof.professionals} /> {prof.professionals === 1 ? 'profissional' : 'profissionais'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-purple-600">
                        <AnimatedCurrency value={prof.hourlyCost} />/h
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">custo médio</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>Nenhum profissional cadastrado</p>
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Origin Stats and Birthday Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OriginStatsWidget />
        <BirthdayWidget />
      </div>
    </div>
  );
}
