'use client';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Pencil, 
  Trash2, 
  X, 
  Plus,
  Building2,
  Percent,
  TrendingDown,
  CreditCard,
  Receipt,
  Users,
  RefreshCw,
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface Cost {
  id: string;
  description: string;
  costType: 'FIXED' | 'PERCENTAGE';
  category: 'OPERATIONAL' | 'TAX' | 'COMMISSION' | 'CARD' | 'CUSTOM';
  customCategory: string | null;
  fixedValue: number | null;
  percentage: number | null;
  paymentDate: string | null;
  cardOperator: string | null;
  receivingDays: number | null;
  isRecurring: boolean;
  isActive: boolean;
  recurrenceFrequency: 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | null;
  nextRecurrenceDate: string | null;
  recurrenceType: 'INDEFINITE' | 'INSTALLMENTS';
  totalInstallments: number | null;
  currentInstallment: number | null;
}

interface CardFeeRule {
  id: string;
  cardOperator: string;
  cardType: 'DEBIT' | 'CREDIT';
  installmentCount: number;
  feePercentage: number;
  receivingDays: number;
  isActive: boolean;
}

interface CardGroup {
  operator: string;
  type: 'DEBIT' | 'CREDIT';
  receivingDays: number;
  installments: Array<{ count: number; feePercentage: number }>;
}

interface RecurringCostsPending {
  pending: Cost[];
  pendingCount: number;
  upcoming: Cost[];
  upcomingCount: number;
  totalRecurring: number;
  allRecurring: Cost[];
}

interface CostStats {
  fixedCostsTotal: number;
  totalItems: number;
  categoryCounts: {
    operational: number;
    taxes: number;
    commissions: number;
  };
}

export default function CostsPage() {
  const [costs, setCosts] = useState<Cost[]>([]);
  const [cardFeeRules, setCardFeeRules] = useState<CardFeeRule[]>([]);
  const [stats, setStats] = useState<CostStats>({
    fixedCostsTotal: 0,
    totalItems: 0,
    categoryCounts: { operational: 0, taxes: 0, commissions: 0 },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [editingFixedCost, setEditingFixedCost] = useState<Cost | null>(null);
  const [editingVariableCost, setEditingVariableCost] = useState<Cost | null>(null);
  const [editingCardFeeRule, setEditingCardFeeRule] = useState<CardFeeRule | null>(null);

  // Form state for Fixed Costs
  const [fixedFormData, setFixedFormData] = useState({
    description: '',
    fixedValue: '',
    paymentDate: '',
    isRecurring: false,
    recurrenceFrequency: 'MONTHLY' as 'MONTHLY' | 'QUARTERLY' | 'YEARLY',
    nextRecurrenceDate: '',
    recurrenceType: 'INDEFINITE' as 'INDEFINITE' | 'INSTALLMENTS',
    totalInstallments: '',
  });

  // Form state for Variable Costs (Taxes and Fees)
  const [variableFormData, setVariableFormData] = useState({
    description: '',
    percentage: '',
    category: 'TAX' as 'TAX' | 'COMMISSION',
  });

  // Form state for Card Fee Rules
  const [cardFeeFormData, setCardFeeFormData] = useState({
    cardOperator: '',
    cardType: 'CREDIT' as 'DEBIT' | 'CREDIT',
    receivingDays: '',
  });

  // Installments state for card fees
  const [installmentLines, setInstallmentLines] = useState<Array<{ count: string; feePercentage: string }>>([
    { count: '', feePercentage: '' }
  ]);

  // Editing state
  const [editingCard, setEditingCard] = useState<{ operator: string; type: 'DEBIT' | 'CREDIT' } | null>(null);

  useEffect(() => {
    fetchCosts();
    fetchCardFeeRules();
    fetchStats();
  }, []);

  const fetchCosts = async () => {
    try {
      const res = await fetch('/api/costs');
      if (res.ok) {
        const data = await res.json();
        // Filter out CARD category from costs
        setCosts(data.filter((c: Cost) => c.category !== 'CARD'));
      }
    } catch (error) {
      console.error('Error fetching costs:', error);
      toast.error('Erro ao carregar custos');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCardFeeRules = async () => {
    try {
      const res = await fetch('/api/costs/card-fees');
      if (res.ok) {
        const data = await res.json();
        setCardFeeRules(data.rules || []);
      }
    } catch (error) {
      console.error('Error fetching card fees:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/costs/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Fixed Costs Handlers
  const handleFixedCostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fixedFormData.description || !fixedFormData.fixedValue) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const payload = {
      description: fixedFormData.description,
      costType: 'FIXED',
      category: 'OPERATIONAL',
      fixedValue: parseFloat(fixedFormData.fixedValue),
      paymentDate: fixedFormData.paymentDate || new Date().toISOString().split('T')[0],
      isRecurring: fixedFormData.isRecurring,
      recurrenceFrequency: fixedFormData.isRecurring ? fixedFormData.recurrenceFrequency : null,
      nextRecurrenceDate: fixedFormData.isRecurring && fixedFormData.nextRecurrenceDate ? fixedFormData.nextRecurrenceDate : null,
      recurrenceType: fixedFormData.isRecurring ? fixedFormData.recurrenceType : 'INDEFINITE',
      totalInstallments: fixedFormData.recurrenceType === 'INSTALLMENTS' && fixedFormData.totalInstallments ? parseInt(fixedFormData.totalInstallments) : null,
    };

    try {
      const url = editingFixedCost ? `/api/costs/${editingFixedCost.id}` : '/api/costs';
      const method = editingFixedCost ? 'PATCH' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(editingFixedCost ? 'Custo atualizado!' : 'Custo adicionado!');
        resetFixedForm();
        fetchCosts();
        fetchStats();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erro ao salvar custo');
      }
    } catch (error) {
      console.error('Error saving cost:', error);
      toast.error('Erro ao salvar custo');
    }
  };

  const handleEditFixedCost = (cost: Cost) => {
    setEditingFixedCost(cost);
    setFixedFormData({
      description: cost.description,
      fixedValue: cost.fixedValue?.toString() || '',
      paymentDate: cost.paymentDate || '',
      isRecurring: cost.isRecurring,
      recurrenceFrequency: cost.recurrenceFrequency || 'MONTHLY',
      nextRecurrenceDate: cost.nextRecurrenceDate || '',
      recurrenceType: cost.recurrenceType || 'INDEFINITE',
      totalInstallments: cost.totalInstallments?.toString() || '',
    });
  };

  const handleDeleteFixedCost = async (id: string) => {
    if (!confirm('Deseja realmente excluir este custo?')) return;

    try {
      const res = await fetch(`/api/costs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Custo excluído!');
        fetchCosts();
        fetchStats();
      } else {
        toast.error('Erro ao excluir custo');
      }
    } catch (error) {
      console.error('Error deleting cost:', error);
      toast.error('Erro ao excluir custo');
    }
  };

  const resetFixedForm = () => {
    setEditingFixedCost(null);
    setFixedFormData({
      description: '',
      fixedValue: '',
      paymentDate: '',
      isRecurring: false,
      recurrenceFrequency: 'MONTHLY',
      nextRecurrenceDate: '',
      recurrenceType: 'INDEFINITE',
      totalInstallments: '',
    });
  };

  // Variable Costs (Taxes and Fees) Handlers
  const handleVariableCostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!variableFormData.description || !variableFormData.percentage) {
      toast.error('Preencha todos os campos');
      return;
    }

    const payload = {
      description: variableFormData.description,
      costType: 'PERCENTAGE',
      category: variableFormData.category,
      percentage: parseFloat(variableFormData.percentage),
    };

    try {
      const url = editingVariableCost ? `/api/costs/${editingVariableCost.id}` : '/api/costs';
      const method = editingVariableCost ? 'PATCH' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(editingVariableCost ? 'Taxa atualizada!' : 'Taxa adicionada!');
        resetVariableForm();
        fetchCosts();
        fetchStats();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erro ao salvar taxa');
      }
    } catch (error) {
      console.error('Error saving cost:', error);
      toast.error('Erro ao salvar taxa');
    }
  };

  const handleEditVariableCost = (cost: Cost) => {
    setEditingVariableCost(cost);
    setVariableFormData({
      description: cost.description,
      percentage: cost.percentage?.toString() || '',
      category: cost.category as 'TAX' | 'COMMISSION',
    });
  };

  const handleDeleteVariableCost = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta taxa?')) return;

    try {
      const res = await fetch(`/api/costs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Taxa excluída!');
        fetchCosts();
        fetchStats();
      } else {
        toast.error('Erro ao excluir taxa');
      }
    } catch (error) {
      console.error('Error deleting cost:', error);
      toast.error('Erro ao excluir taxa');
    }
  };

  const resetVariableForm = () => {
    setEditingVariableCost(null);
    setVariableFormData({
      description: '',
      percentage: '',
      category: 'TAX',
    });
  };

  // Helper to group card fee rules by operator + type
  const groupCardsByOperatorAndType = (): CardGroup[] => {
    const groups = new Map<string, CardGroup>();

    cardFeeRules.forEach(rule => {
      const key = `${rule.cardOperator}_${rule.cardType}`;
      if (!groups.has(key)) {
        groups.set(key, {
          operator: rule.cardOperator,
          type: rule.cardType,
          receivingDays: rule.receivingDays,
          installments: []
        });
      }
      groups.get(key)!.installments.push({
        count: rule.installmentCount,
        feePercentage: rule.feePercentage
      });
    });

    // Sort installments by count
    groups.forEach(group => {
      group.installments.sort((a, b) => a.count - b.count);
    });

    return Array.from(groups.values());
  };

  // Card Fee Rules Handlers
  const addInstallmentLine = () => {
    setInstallmentLines([...installmentLines, { count: '', feePercentage: '' }]);
  };

  const removeInstallmentLine = (index: number) => {
    if (installmentLines.length === 1) {
      toast.error('Pelo menos uma parcela é obrigatória');
      return;
    }
    const newLines = installmentLines.filter((_, i) => i !== index);
    setInstallmentLines(newLines);
  };

  const updateInstallmentLine = (index: number, field: 'count' | 'feePercentage', value: string) => {
    const newLines = [...installmentLines];
    newLines[index][field] = value;
    setInstallmentLines(newLines);
  };

  const handleCardFeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cardFeeFormData.cardOperator || !cardFeeFormData.receivingDays) {
      toast.error('Preencha a operadora e o prazo de recebimento');
      return;
    }

    // Validate installments
    const validInstallments = installmentLines.filter(line => line.count && line.feePercentage);
    if (validInstallments.length === 0) {
      toast.error('Adicione pelo menos uma parcela com taxa');
      return;
    }

    const payload = {
      cardOperator: cardFeeFormData.cardOperator.trim(),
      cardType: cardFeeFormData.cardType,
      receivingDays: parseInt(cardFeeFormData.receivingDays),
      installments: validInstallments.map(line => ({
        count: parseInt(line.count),
        feePercentage: parseFloat(line.feePercentage)
      }))
    };

    try {
      const url = editingCard ? '/api/costs/card-fees/group' : '/api/costs/card-fees';
      const method = editingCard ? 'PATCH' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(editingCard ? 'Cartão atualizado!' : 'Cartão cadastrado!');
        resetCardFeeForm();
        fetchCardFeeRules();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erro ao salvar cartão');
      }
    } catch (error) {
      console.error('Error saving card fee:', error);
      toast.error('Erro ao salvar cartão');
    }
  };

  const handleEditCardGroup = (group: CardGroup) => {
    setEditingCard({ operator: group.operator, type: group.type });
    setCardFeeFormData({
      cardOperator: group.operator,
      cardType: group.type,
      receivingDays: group.receivingDays.toString(),
    });
    setInstallmentLines(
      group.installments.map(inst => ({
        count: inst.count.toString(),
        feePercentage: inst.feePercentage.toString()
      }))
    );
  };

  const handleDeleteCardGroup = async (operator: string, type: 'DEBIT' | 'CREDIT') => {
    if (!confirm(`Deseja realmente excluir o cartão ${operator} - ${type === 'DEBIT' ? 'Débito' : 'Crédito'}?`)) return;

    try {
      const res = await fetch(`/api/costs/card-fees/group?operator=${encodeURIComponent(operator)}&type=${type}`, { 
        method: 'DELETE' 
      });
      if (res.ok) {
        toast.success('Cartão excluído!');
        fetchCardFeeRules();
      } else {
        toast.error('Erro ao excluir cartão');
      }
    } catch (error) {
      console.error('Error deleting card group:', error);
      toast.error('Erro ao excluir cartão');
    }
  };

  const resetCardFeeForm = () => {
    setEditingCard(null);
    setCardFeeFormData({
      cardOperator: '',
      cardType: 'CREDIT',
      receivingDays: '',
    });
    setInstallmentLines([{ count: '', feePercentage: '' }]);
  };

  const fixedCosts = costs.filter((c) => c.costType === 'FIXED');
  const variableCosts = costs.filter((c) => c.costType === 'PERCENTAGE' && c.category !== 'CARD');
  const totalVariablePercentage = variableCosts.reduce((sum, c) => sum + (c.percentage || 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Gestão de Custos</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Gerencie custos fixos, taxas sobre vendas e taxas de cartão</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Custos Fixos Mensais</p>
              <p className="text-3xl font-bold mt-2">{formatCurrency(stats.fixedCostsTotal)}</p>
              <p className="text-blue-100 text-xs mt-1">{fixedCosts.length} custos cadastrados</p>
            </div>
            <Building2 className="h-12 w-12 opacity-80" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Taxas e Impostos</p>
              <p className="text-3xl font-bold mt-2">{formatPercent(totalVariablePercentage)}</p>
              <p className="text-orange-100 text-xs mt-1">{variableCosts.length} taxas cadastradas</p>
            </div>
            <Receipt className="h-12 w-12 opacity-80" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Cartões Cadastrados</p>
              <p className="text-3xl font-bold mt-2">{groupCardsByOperatorAndType().length}</p>
              <p className="text-purple-100 text-xs mt-1">Operadoras configuradas</p>
            </div>
            <CreditCard className="h-12 w-12 opacity-80" />
          </div>
        </motion.div>
      </div>

      {/* ========== 1. FIXED COSTS SECTION (BLUE) ========== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-xl p-6 shadow-lg border border-blue-200 dark:border-blue-800"
      >
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <div>
            <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-100">Custos Fixos Mensais</h2>
            <p className="text-blue-700 dark:text-blue-300 text-sm">Despesas recorrentes operacionais</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md border border-blue-200 dark:border-blue-800">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">
              {editingFixedCost ? 'Editar Custo Fixo' : 'Cadastrar Custo Fixo'}
            </h3>
            <form onSubmit={handleFixedCostSubmit} className="space-y-4">
              <div>
                <Label>Descrição *</Label>
                <Input
                  value={fixedFormData.description}
                  onChange={(e) => setFixedFormData({ ...fixedFormData, description: e.target.value })}
                  placeholder="Ex: Aluguel"
                  className="border-blue-300 dark:border-blue-700"
                />
              </div>

              <div>
                <Label>Valor *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={fixedFormData.fixedValue}
                  onChange={(e) => setFixedFormData({ ...fixedFormData, fixedValue: e.target.value })}
                  placeholder="Ex: 3000.00"
                  className="border-blue-300 dark:border-blue-700"
                />
              </div>

              <div>
                <Label>Data de Pagamento</Label>
                <Input
                  type="date"
                  value={fixedFormData.paymentDate}
                  onChange={(e) => setFixedFormData({ ...fixedFormData, paymentDate: e.target.value })}
                  className="border-blue-300 dark:border-blue-700"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isRecurring"
                  checked={fixedFormData.isRecurring}
                  onChange={(e) => setFixedFormData({ ...fixedFormData, isRecurring: e.target.checked })}
                  className="rounded border-blue-300"
                />
                <Label htmlFor="isRecurring" className="cursor-pointer">Custo Recorrente</Label>
              </div>

              {fixedFormData.isRecurring && (
                <>
                  <div>
                    <Label>Frequência</Label>
                    <select
                      value={fixedFormData.recurrenceFrequency}
                      onChange={(e) => setFixedFormData({ ...fixedFormData, recurrenceFrequency: e.target.value as any })}
                      className="w-full rounded-md border border-blue-300 dark:border-blue-700 bg-white dark:bg-gray-900 px-3 py-2"
                    >
                      <option value="MONTHLY">Mensal</option>
                      <option value="QUARTERLY">Trimestral</option>
                      <option value="YEARLY">Anual</option>
                    </select>
                  </div>

                  <div>
                    <Label>Tipo de Recorrência</Label>
                    <select
                      value={fixedFormData.recurrenceType}
                      onChange={(e) => setFixedFormData({ ...fixedFormData, recurrenceType: e.target.value as any })}
                      className="w-full rounded-md border border-blue-300 dark:border-blue-700 bg-white dark:bg-gray-900 px-3 py-2"
                    >
                      <option value="INDEFINITE">Indeterminada</option>
                      <option value="INSTALLMENTS">Parcelada</option>
                    </select>
                  </div>

                  {fixedFormData.recurrenceType === 'INSTALLMENTS' && (
                    <div>
                      <Label>Total de Parcelas</Label>
                      <Input
                        type="number"
                        min="1"
                        value={fixedFormData.totalInstallments}
                        onChange={(e) => setFixedFormData({ ...fixedFormData, totalInstallments: e.target.value })}
                        className="border-blue-300 dark:border-blue-700"
                      />
                    </div>
                  )}
                </>
              )}

              <div className="flex gap-2">
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                  {editingFixedCost ? 'Atualizar' : 'Adicionar'}
                </Button>
                {editingFixedCost && (
                  <Button type="button" variant="outline" onClick={resetFixedForm}>
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          </div>

          {/* List */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">Custos Cadastrados</h3>
            {fixedCosts.length === 0 ? (
              <div className="text-center py-8 text-blue-600 dark:text-blue-400">
                <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum custo fixo cadastrado</p>
              </div>
            ) : (
              fixedCosts.map((cost) => (
                <div
                  key={cost.id}
                  className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-800 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100">{cost.description}</h4>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                        {formatCurrency(cost.fixedValue || 0)}
                      </p>
                      {cost.isRecurring && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          🔄 {cost.recurrenceFrequency === 'MONTHLY' ? 'Mensal' : cost.recurrenceFrequency === 'QUARTERLY' ? 'Trimestral' : 'Anual'}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleEditFixedCost(cost)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteFixedCost(cost.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </motion.div>

      {/* ========== 2. TAXES AND FEES SECTION (ORANGE) ========== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 rounded-xl p-6 shadow-lg border border-orange-200 dark:border-orange-800"
      >
        <div className="flex items-center gap-3 mb-6">
          <Receipt className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          <div>
            <h2 className="text-2xl font-bold text-orange-900 dark:text-orange-100">Taxas e Impostos</h2>
            <p className="text-orange-700 dark:text-orange-300 text-sm">Custos percentuais sobre vendas (exceto cartão)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md border border-orange-200 dark:border-orange-800">
            <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-100 mb-4">
              {editingVariableCost ? 'Editar Taxa' : 'Cadastrar Taxa'}
            </h3>
            <form onSubmit={handleVariableCostSubmit} className="space-y-4">
              <div>
                <Label>Descrição *</Label>
                <Input
                  value={variableFormData.description}
                  onChange={(e) => setVariableFormData({ ...variableFormData, description: e.target.value })}
                  placeholder="Ex: ISS"
                  className="border-orange-300 dark:border-orange-700"
                />
              </div>

              <div>
                <Label>Categoria *</Label>
                <select
                  value={variableFormData.category}
                  onChange={(e) => setVariableFormData({ ...variableFormData, category: e.target.value as any })}
                  className="w-full rounded-md border border-orange-300 dark:border-orange-700 bg-white dark:bg-gray-900 px-3 py-2"
                >
                  <option value="TAX">Imposto</option>
                  <option value="COMMISSION">Comissão</option>
                </select>
              </div>

              <div>
                <Label>Percentual (%) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={variableFormData.percentage}
                  onChange={(e) => setVariableFormData({ ...variableFormData, percentage: e.target.value })}
                  placeholder="Ex: 5.5"
                  className="border-orange-300 dark:border-orange-700"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1 bg-orange-600 hover:bg-orange-700">
                  {editingVariableCost ? 'Atualizar' : 'Adicionar'}
                </Button>
                {editingVariableCost && (
                  <Button type="button" variant="outline" onClick={resetVariableForm}>
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          </div>

          {/* List */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-100 mb-4">Taxas Cadastradas</h3>
            {variableCosts.length === 0 ? (
              <div className="text-center py-8 text-orange-600 dark:text-orange-400">
                <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma taxa cadastrada</p>
              </div>
            ) : (
              variableCosts.map((cost) => (
                <div
                  key={cost.id}
                  className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-orange-200 dark:border-orange-800 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100">{cost.description}</h4>
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                        {formatPercent(cost.percentage || 0)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {cost.category === 'TAX' ? '📊 Imposto' : '💰 Comissão'}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleEditVariableCost(cost)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteVariableCost(cost.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </motion.div>

      {/* ========== 3. CARD FEE RULES SECTION (PURPLE) ========== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 rounded-xl p-6 shadow-lg border border-purple-200 dark:border-purple-800"
      >
        <div className="flex items-center gap-3 mb-6">
          <CreditCard className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          <div>
            <h2 className="text-2xl font-bold text-purple-900 dark:text-purple-100">Cartões de Crédito e Débito</h2>
            <p className="text-purple-700 dark:text-purple-300 text-sm">Operadoras, taxas por parcelas e prazos de recebimento</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md border border-purple-200 dark:border-purple-800">
            <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-4">
              {editingCard ? 'Editar Cartão' : 'Cadastrar Cartão'}
            </h3>
            <form onSubmit={handleCardFeeSubmit} className="space-y-4">
              <div>
                <Label>Operadora *</Label>
                <Input
                  value={cardFeeFormData.cardOperator}
                  onChange={(e) => setCardFeeFormData({ ...cardFeeFormData, cardOperator: e.target.value })}
                  placeholder="Ex: Rede, Stone, PagSeguro"
                  className="border-purple-300 dark:border-purple-700"
                />
              </div>

              <div>
                <Label>Tipo de Cartão *</Label>
                <select
                  value={cardFeeFormData.cardType}
                  onChange={(e) => setCardFeeFormData({ ...cardFeeFormData, cardType: e.target.value as any })}
                  className="w-full rounded-md border border-purple-300 dark:border-purple-700 bg-white dark:bg-gray-900 px-3 py-2"
                >
                  <option value="DEBIT">Débito</option>
                  <option value="CREDIT">Crédito</option>
                </select>
              </div>

              <div>
                <Label>Prazo de Recebimento (dias) *</Label>
                <Input
                  type="number"
                  min="0"
                  value={cardFeeFormData.receivingDays}
                  onChange={(e) => setCardFeeFormData({ ...cardFeeFormData, receivingDays: e.target.value })}
                  placeholder="Ex: 30"
                  className="border-purple-300 dark:border-purple-700"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Dias até o recebimento da primeira parcela
                </p>
              </div>

              {/* Installments Section */}
              <div className="border border-purple-200 dark:border-purple-700 rounded-lg p-4 bg-purple-50 dark:bg-purple-950">
                <div className="flex justify-between items-center mb-3">
                  <Label className="text-purple-900 dark:text-purple-100">Parcelas e Taxas *</Label>
                  <Button 
                    type="button" 
                    size="sm" 
                    onClick={addInstallmentLine}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
                <div className="space-y-2">
                  {installmentLines.map((line, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          min="1"
                          value={line.count}
                          onChange={(e) => updateInstallmentLine(index, 'count', e.target.value)}
                          placeholder="Parcelas"
                          className="border-purple-300 dark:border-purple-700 bg-white dark:bg-gray-900"
                        />
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.feePercentage}
                          onChange={(e) => updateInstallmentLine(index, 'feePercentage', e.target.value)}
                          placeholder="Taxa %"
                          className="border-purple-300 dark:border-purple-700 bg-white dark:bg-gray-900"
                        />
                      </div>
                      <Button 
                        type="button" 
                        size="sm" 
                        variant="ghost"
                        onClick={() => removeInstallmentLine(index)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  💡 Ex: 1x com 2,5% | 2x com 3,0% | 3x com 3,5%
                </p>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700">
                  {editingCard ? 'Atualizar' : 'Salvar Cartão'}
                </Button>
                {editingCard && (
                  <Button type="button" variant="outline" onClick={resetCardFeeForm}>
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          </div>

          {/* List */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-4">Cartões Cadastrados</h3>
            {groupCardsByOperatorAndType().length === 0 ? (
              <div className="text-center py-8 text-purple-600 dark:text-purple-400">
                <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum cartão cadastrado</p>
              </div>
            ) : (
              groupCardsByOperatorAndType().map((group, index) => (
                <div
                  key={`${group.operator}_${group.type}_${index}`}
                  className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-purple-200 dark:border-purple-800 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-purple-600" />
                        {group.operator} - {group.type === 'DEBIT' ? 'Débito' : 'Crédito'}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        ⏱️ Recebimento em {group.receivingDays} {group.receivingDays === 1 ? 'dia' : 'dias'}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleEditCardGroup(group)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteCardGroup(group.operator, group.type)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {group.installments.map((inst, idx) => (
                      <div 
                        key={idx}
                        className="inline-flex items-center gap-1 bg-purple-100 dark:bg-purple-900 px-3 py-1 rounded-full text-sm"
                      >
                        <span className="font-semibold text-purple-900 dark:text-purple-100">{inst.count}x:</span>
                        <span className="text-purple-700 dark:text-purple-300">{formatPercent(inst.feePercentage)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
