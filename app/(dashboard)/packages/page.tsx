'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Package, Trash2, Edit2, Tag, TrendingUp, Clock, DollarSign, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'react-hot-toast';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils';

interface Procedure {
  id: string;
  name: string;
  price: number;
  supplies: Array<{
    quantity: number;
    supply: {
      id: string;
      name: string;
      costPerUnit: number;
    };
  }>;
  collaborators: Array<{
    timeMinutes: number;
    collaborator: {
      id: string;
      name: string;
      role: string;
      baseSalary: number;
      charges: number;
      monthlyHours: number;
    };
  }>;
}

interface PackageItem {
  procedureId: string;
  procedure: Procedure;
  quantity: number;
}

interface PackageData {
  id: string;
  name: string;
  finalPrice: number;
  discountPercent: number;
  items: PackageItem[];
  createdAt: string;
}

interface VariableCost {
  id: string;
  description: string;
  category: string;
  percentage: number;
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [variableCosts, setVariableCosts] = useState<VariableCost[]>([]);
  const [taxBurden, setTaxBurden] = useState(0);
  const [loading, setLoading] = useState(true);
  const [costsLoaded, setCostsLoaded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [packageName, setPackageName] = useState('');
  const [selectedProcedures, setSelectedProcedures] = useState<Array<{ procedureId: string; quantity: number }>>([]);
  const [finalPrice, setFinalPrice] = useState<number>(0);
  const [discountPercentInput, setDiscountPercentInput] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Payment method for financial analysis
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH_PIX');
  const [installments, setInstallments] = useState<number>(1);
  const [cardFeeRules, setCardFeeRules] = useState<any[]>([]);
  
  // Calculated variable costs
  const [calculatedVarCosts, setCalculatedVarCosts] = useState<{
    total: number;
    taxes: number;
    cardFees: number;
    cardFeePercentage: number;
    commissions: number;
  }>({ total: 0, taxes: 0, cardFees: 0, cardFeePercentage: 0, commissions: 0 });

  useEffect(() => {
    fetchData();
  }, []);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Calculate variable costs whenever dependencies change
  useEffect(() => {
    console.log('🧮 [useEffect] Recalculando custos variáveis:', {
      finalPrice,
      paymentMethod,
      costsLoaded,
      variableCostsLength: variableCosts.length
    });
    
    // If no costs loaded, return zeros
    if (!costsLoaded || variableCosts.length === 0) {
      console.warn('⚠️ [useEffect] Custos não carregados, retornando zeros');
      setCalculatedVarCosts({ total: 0, taxes: 0, cardFees: 0, cardFeePercentage: 0, commissions: 0 });
      return;
    }
    
    // Calculate taxes (always apply)
    const taxesFiltered = variableCosts.filter(c => c.category === 'TAX');
    const taxes = taxesFiltered.reduce((sum, c) => sum + (finalPrice * (c.percentage || 0)) / 100, 0);
    
    console.log('💰 [useEffect] Impostos:', {
      filtered: taxesFiltered.length,
      items: taxesFiltered.map(c => ({ desc: c.description, pct: c.percentage })),
      total: taxes
    });
    
    // Calculate card fees based on payment method and installments
    let cardFees = 0;
    let cardFeePercentage = 0;
    
    if (paymentMethod === 'CREDIT_CARD' && cardFeeRules.length > 0) {
      // Find the matching card fee rule by exact installment count
      const matchingRule = cardFeeRules.find(
        rule => rule.installmentCount === installments
      );
      
      if (matchingRule) {
        cardFeePercentage = matchingRule.feePercentage;
        cardFees = (finalPrice * cardFeePercentage) / 100;
        console.log('💳 [useEffect] Regra encontrada (Packages):', {
          parcelas: installments,
          percentual: cardFeePercentage,
          valor: cardFees
        });
      }
    }
    
    console.log('💳 [useEffect] Taxas de Cartão (Packages):', cardFees);
    
    // Calculate commissions (always apply)
    const commissionsFiltered = variableCosts.filter(c => c.category === 'COMMISSION');
    const commissions = commissionsFiltered.reduce((sum, c) => sum + (finalPrice * (c.percentage || 0)) / 100, 0);
    
    console.log('🤝 [useEffect] Comissões:', {
      filtered: commissionsFiltered.length,
      items: commissionsFiltered.map(c => ({ desc: c.description, pct: c.percentage })),
      total: commissions
    });
    
    const total = taxes + cardFees + commissions;
    
    console.log('📊 [useEffect] TOTAL Custos Variáveis:', {
      taxes,
      cardFees,
      commissions,
      total
    });
    
    setCalculatedVarCosts({ total, taxes, cardFees, cardFeePercentage, commissions });
  }, [variableCosts, finalPrice, paymentMethod, installments, cardFeeRules, costsLoaded]);

  async function fetchData() {
    try {
      console.log('🔄 Iniciando fetch de dados...');
      
      const [packagesRes, proceduresRes, costsRes, cardFeesRes] = await Promise.all([
        fetch('/api/packages'),
        fetch('/api/procedures'),
        fetch('/api/costs/variable'),
        fetch('/api/costs/card-fees'),
      ]);

      console.log('📡 Respostas recebidas:', {
        packages: packagesRes.ok,
        procedures: proceduresRes.ok,
        costs: costsRes.ok,
        cardFees: cardFeesRes.ok
      });

      if (packagesRes.ok && proceduresRes.ok) {
        const packagesData = await packagesRes.json();
        const proceduresData = await proceduresRes.json();
        setPackages(packagesData);
        setProcedures(proceduresData);
      }
      
      if (costsRes.ok) {
        const costsData = await costsRes.json();
        console.log('📊 Custos Variáveis Carregados:', {
          total: costsData.costs?.length || 0,
          custos: costsData.costs,
          porcentagemTotal: costsData.totalPercentage,
          grouped: costsData.grouped
        });
        
        const costsArray = costsData.costs || [];
        console.log('🔄 Atualizando state com custos:', costsArray);
        
        setVariableCosts(costsArray);
        setTaxBurden(costsData.taxBurden || 0);
        setCostsLoaded(true);
        
        console.log('✅ State atualizado:', {
          length: costsArray.length,
          loaded: true
        });
      } else {
        const errorText = await costsRes.text();
        console.error('❌ Erro ao carregar custos variáveis:', {
          status: costsRes.status,
          statusText: costsRes.statusText,
          error: errorText
        });
        setCostsLoaded(false);
      }

      if (cardFeesRes.ok) {
        const cardFeesData = await cardFeesRes.json();
        setCardFeeRules(cardFeesData.rules || []);
        console.log('💳 Card Fee Rules carregadas (Packages):', cardFeesData.rules);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }

  // Calculate costs for procedures
  function calculateProcedureCost(procedure: Procedure): number {
    // Custo de insumos
    const supplyCost = procedure.supplies.reduce(
      (sum, ps) => sum + ps.quantity * ps.supply.costPerUnit,
      0
    );

    // Custo de mão de obra (hora)
    const laborCost = procedure.collaborators.reduce((sum, pc) => {
      const hourlyRate =
        (pc.collaborator.baseSalary + pc.collaborator.charges) /
        (pc.collaborator.monthlyHours || 160);
      return sum + (hourlyRate * pc.timeMinutes) / 60;
    }, 0);

    return supplyCost + laborCost;
  }

  // Calculate total standalone price (sum of procedure prices)
  function calculateStandalonePrice(): number {
    return selectedProcedures.reduce((sum, item) => {
      const proc = procedures.find((p) => p.id === item.procedureId);
      return sum + (proc?.price || 0) * item.quantity;
    }, 0);
  }

  // Calculate total cost (supplies + labor)
  function calculateTotalCost(): number {
    return selectedProcedures.reduce((sum, item) => {
      const proc = procedures.find((p) => p.id === item.procedureId);
      if (!proc) return sum;
      return sum + calculateProcedureCost(proc) * item.quantity;
    }, 0);
  }

  // Calculate net revenue after variable costs
  const netRevenue = useMemo(() => {
    return finalPrice - calculatedVarCosts.total;
  }, [finalPrice, calculatedVarCosts]);

  // Calculate profit margin (considering variable costs)
  const margin = useMemo(() => {
    const directCost = calculateTotalCost();
    const profit = netRevenue - directCost;
    const percent = netRevenue > 0 ? (profit / netRevenue) * 100 : 0;
    return { value: profit, percent };
  }, [netRevenue, selectedProcedures, procedures]);

  // Calculate discount percentage
  function calculateDiscountPercent(): number {
    const standalone = calculateStandalonePrice();
    if (standalone === 0) return 0;
    return ((standalone - finalPrice) / standalone) * 100;
  }

  // Handle final price change - update discount percent
  function handleFinalPriceChange(value: number) {
    setFinalPrice(value);
    
    const standalone = calculateStandalonePrice();
    if (standalone > 0 && value >= 0) {
      const calculatedDiscount = ((standalone - value) / standalone) * 100;
      setDiscountPercentInput(formatNumber(calculatedDiscount, 1));
    } else {
      setDiscountPercentInput('');
    }
  }

  // Handle discount percent change - update final price
  function handleDiscountPercentChange(value: string) {
    setDiscountPercentInput(value);
    
    // Converte vírgula para ponto para parseFloat
    const normalizedValue = value.replace(',', '.');
    const discount = parseFloat(normalizedValue) || 0;
    const standalone = calculateStandalonePrice();
    if (standalone > 0 && discount >= 0 && discount <= 100) {
      const calculatedPrice = standalone * (1 - discount / 100);
      setFinalPrice(Math.max(0, calculatedPrice)); // Prevent negative prices
    }
  }

  function addProcedureToPackage(procedureId: string) {
    const existing = selectedProcedures.find((p) => p.procedureId === procedureId);
    if (existing) {
      toast.error('Procedimento já adicionado ao pacote');
      return;
    }
    setSelectedProcedures([...selectedProcedures, { procedureId, quantity: 1 }]);
    setIsDropdownOpen(false);
  }

  function updateQuantity(procedureId: string, quantity: number) {
    if (quantity < 1) return;
    setSelectedProcedures(
      selectedProcedures.map((p) =>
        p.procedureId === procedureId ? { ...p, quantity } : p
      )
    );
  }

  function removeProcedure(procedureId: string) {
    setSelectedProcedures(selectedProcedures.filter((p) => p.procedureId !== procedureId));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!packageName.trim()) {
      toast.error('Digite o nome do pacote');
      return;
    }

    if (selectedProcedures.length === 0) {
      toast.error('Adicione pelo menos um procedimento');
      return;
    }

    if (finalPrice <= 0) {
      toast.error('Digite o preço final do pacote');
      return;
    }

    const payload = {
      name: packageName,
      finalPrice,
      discountPercent: calculateDiscountPercent(),
      items: selectedProcedures,
    };

    try {
      const url = editingId ? `/api/packages/${editingId}` : '/api/packages';
      const method = editingId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success(editingId ? 'Pacote atualizado!' : 'Pacote criado!');
        resetForm();
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao salvar pacote');
      }
    } catch (error) {
      console.error('Error saving package:', error);
      toast.error('Erro ao salvar pacote');
    }
  }

  function resetForm() {
    setPackageName('');
    setSelectedProcedures([]);
    setFinalPrice(0);
    setDiscountPercentInput('');
    setEditingId(null);
  }

  function editPackage(pkg: PackageData) {
    setEditingId(pkg.id);
    setPackageName(pkg.name);
    setFinalPrice(pkg.finalPrice);
    setDiscountPercentInput(formatNumber(pkg.discountPercent, 1));
    setSelectedProcedures(
      pkg.items.map((item) => ({
        procedureId: item.procedure.id,
        quantity: item.quantity,
      }))
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deletePackage(id: string) {
    if (!confirm('Deseja realmente excluir este pacote?')) return;

    try {
      const response = await fetch(`/api/packages/${id}`, { method: 'DELETE' });
      if (response.ok) {
        toast.success('Pacote excluído!');
        fetchData();
      } else {
        toast.error('Erro ao excluir pacote');
      }
    } catch (error) {
      console.error('Error deleting package:', error);
      toast.error('Erro ao excluir pacote');
    }
  }

  const standalonePrice = calculateStandalonePrice();
  const totalCost = calculateTotalCost();
  const discountPercent = calculateDiscountPercent();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-purple-600">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Precificação & Pacotes</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Crie pacotes promocionais unindo seus procedimentos técnicos.
        </p>
      </motion.div>

      {/* Two-column Layout */}
      <div className="grid lg:grid-cols-2 gap-4 md:gap-6 mb-8">
        {/* Left Column - Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-purple-200">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingId ? 'Editar Pacote' : 'Novo Pacote'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Package Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-2">
                    Nome do Pacote
                  </label>
                  <Input
                    placeholder="Ex: Protocolo Noiva Completo"
                    value={packageName}
                    onChange={(e) => setPackageName(e.target.value)}
                    className="border-gray-300 dark:border-gray-600 focus:border-purple-500 focus:ring-purple-500"
                  />
                </div>

                {/* Procedure Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-2">
                    Itens Inclusos no Pacote
                  </label>
                  <div className="relative" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full px-4 py-2 text-left border border-gray-300 dark:border-gray-600 rounded-md hover:border-purple-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors bg-white dark:bg-gray-900"
                    >
                      <span className="text-gray-700 dark:text-gray-300">Selecionar Procedimento...</span>
                    </button>

                    {isDropdownOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
                        {procedures.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                            Nenhum procedimento cadastrado
                          </div>
                        ) : (
                          procedures.map((proc) => (
                            <button
                              key={proc.id}
                              type="button"
                              onClick={() => addProcedureToPackage(proc.id)}
                              className="w-full px-4 py-2 text-left hover:bg-purple-50 transition-colors flex items-center justify-between"
                            >
                              <span className="text-sm text-gray-700 dark:text-gray-300">{proc.name}</span>
                              <span className="text-xs text-gray-600 dark:text-gray-400">
                                {formatCurrency(proc.price)}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Selected Procedures List */}
                  <div className="mt-4 space-y-2">
                    {selectedProcedures.length === 0 ? (
                      <p className="text-sm text-gray-700 dark:text-gray-300 text-center py-4">
                        Nenhum item adicionado ao pacote.
                      </p>
                    ) : (
                      selectedProcedures.map((item) => {
                        const proc = procedures.find((p) => p.id === item.procedureId);
                        if (!proc) return null;

                        return (
                          <div
                            key={item.procedureId}
                            className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700"
                          >
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{proc.name}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                {formatCurrency(proc.price)} cada
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) =>
                                  updateQuantity(item.procedureId, parseInt(e.target.value) || 1)
                                }
                                className="w-16 h-8 text-center border-gray-300 dark:border-gray-600"
                              />
                              <button
                                type="button"
                                onClick={() => removeProcedure(item.procedureId)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Right Column - Pricing Summary */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg p-4 sm:p-6 text-white shadow-lg">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Análise Financeira
            </h3>

            {/* Diagnostic Indicator */}
            <div className={`mb-4 p-3 rounded-lg border-2 ${costsLoaded && variableCosts.length > 0 ? 'bg-green-500/20 border-green-500/50' : 'bg-red-500/20 border-red-500/50'}`}>
              <div className="flex items-center justify-between">
                <span className="text-white text-xs font-medium">
                  {costsLoaded && variableCosts.length > 0 ? '✅ Custos Variáveis Carregados' : '❌ Custos Não Carregados'}
                </span>
                <span className="text-white/90 text-xs">
                  Carga Tributária: {formatNumber(taxBurden, 1)}%
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="mb-6">
              <Label htmlFor="payment-method-selector-package" className="text-white/90 text-sm mb-2 block">
                Modalidade de Pagamento
              </Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger 
                  id="payment-method-selector-package"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/15"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH_PIX">💵 Dinheiro / Pix</SelectItem>
                  <SelectItem value="CREDIT_CARD">💳 Cartão de Crédito</SelectItem>
                  <SelectItem value="DEBIT_CARD">💳 Cartão de Débito</SelectItem>
                  <SelectItem value="BOLETO">📄 Boleto</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-white/60 mt-1">
                Selecione para ver a análise com as taxas corretas
              </p>
            </div>

            {/* Installments Selector - Only for Credit Card */}
            {paymentMethod === 'CREDIT_CARD' && (
              <div className="mb-6">
                <Label htmlFor="installments-selector-package" className="text-white/90 text-sm mb-2 block">
                  Número de Parcelas
                </Label>
                <Select 
                  value={installments.toString()} 
                  onValueChange={(value) => setInstallments(parseInt(value))}
                >
                  <SelectTrigger 
                    id="installments-selector-package"
                    className="bg-white/10 border-white/20 text-white hover:bg-white/15"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1x (À vista)</SelectItem>
                    <SelectItem value="2">2x</SelectItem>
                    <SelectItem value="3">3x</SelectItem>
                    <SelectItem value="4">4x</SelectItem>
                    <SelectItem value="5">5x</SelectItem>
                    <SelectItem value="6">6x</SelectItem>
                    <SelectItem value="7">7x</SelectItem>
                    <SelectItem value="8">8x</SelectItem>
                    <SelectItem value="9">9x</SelectItem>
                    <SelectItem value="10">10x</SelectItem>
                    <SelectItem value="11">11x</SelectItem>
                    <SelectItem value="12">12x</SelectItem>
                  </SelectContent>
                </Select>
                {calculatedVarCosts.cardFeePercentage > 0 && (
                  <p className="text-xs text-yellow-300 mt-1">
                    Taxa aplicada: {formatNumber(calculatedVarCosts.cardFeePercentage, 2)}%
                  </p>
                )}
              </div>
            )}

            <div className="space-y-4">
              {/* Standalone Price */}
              <div className="flex items-center justify-between">
                <span className="text-purple-100 text-sm">Soma dos Itens (Preço Avulso)</span>
                <span className="text-xl font-bold">
                  {formatCurrency(standalonePrice)}
                </span>
              </div>

              {/* Final Price Input */}
              <div>
                <label className="block text-purple-100 text-sm mb-2">
                  Preço Final do Pacote
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-700 dark:text-gray-300 font-semibold">
                    R$
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={finalPrice}
                    onChange={(e) => handleFinalPriceChange(parseFloat(e.target.value) || 0)}
                    className="pl-10 bg-white dark:bg-gray-800 border-white/30 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:bg-white dark:focus:bg-gray-800 focus:border-white font-semibold text-lg"
                    placeholder="0,00"
                  />
                </div>
                <p className="text-xs text-purple-200 mt-1">
                  💡 Ajuste o preço ou o desconto abaixo
                </p>
              </div>

              {/* Discount Input - Now Editable */}
              <div>
                <label className="block text-purple-100 text-sm mb-2">
                  Desconto (%)
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    value={discountPercentInput}
                    onChange={(e) => {
                      // Permite apenas números, vírgulas e pontos
                      const value = e.target.value.replace(/[^\d,\.]/g, '');
                      handleDiscountPercentChange(value);
                    }}
                    className="bg-white dark:bg-gray-800 border-white/30 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:bg-white dark:focus:bg-gray-800 focus:border-white font-semibold text-lg pr-12"
                    placeholder="0,0"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-700 dark:text-gray-300 font-semibold">
                    % OFF
                  </span>
                </div>
                <p className="text-xs text-purple-200 mt-1">
                  💡 Ou ajuste o desconto % que será aplicado
                </p>
              </div>

              {/* Detailed Financial Flow */}
              {finalPrice > 0 && (
                  <div className="space-y-3 pt-4 border-t-2 border-white/30">
                    <div className="text-sm font-bold text-white mb-3">📊 Fluxo de Cálculo Detalhado</div>
                    
                    {/* Step 1: Final Price */}
                    <div className="bg-white/10 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-white/90 text-sm font-medium">1️⃣ Preço de Venda</span>
                        <span className="text-lg font-bold text-white">
                          {formatCurrency(finalPrice)}
                        </span>
                      </div>
                    </div>
                    
                    {/* Step 2: Variable Costs Breakdown - ALWAYS SHOW */}
                    <div className="bg-red-500/20 rounded-lg p-3 space-y-2">
                      <div className="text-white/90 text-sm font-medium mb-2">2️⃣ Descontos sobre Venda</div>
                      
                      {/* Taxes */}
                      <div className="flex items-center justify-between pl-3">
                        <span className="text-white/80 text-xs">• Impostos</span>
                        <span className={`text-sm font-medium ${calculatedVarCosts.taxes > 0 ? 'text-red-200' : 'text-white/60'}`}>
                          {calculatedVarCosts.taxes > 0 ? '-' : ''}{formatCurrency(calculatedVarCosts.taxes)}
                        </span>
                      </div>
                      
                      {/* Card Fees */}
                      {paymentMethod === 'CASH_PIX' ? (
                        <div className="flex items-center justify-between pl-3">
                          <span className="text-white/80 text-xs">• Taxas de Cartão</span>
                          <span className="text-sm font-medium text-green-200">
                            R$ 0,00 ✓
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between pl-3">
                          <span className="text-white/80 text-xs">
                            • {paymentMethod === 'CREDIT_CARD' && `Taxa Crédito ${installments}x (${formatNumber(calculatedVarCosts.cardFeePercentage, 2)}%)`}
                            {paymentMethod === 'DEBIT_CARD' && 'Taxa Débito'}
                            {paymentMethod === 'BOLETO' && 'Taxa Boleto'}
                          </span>
                          <span className={`text-sm font-medium ${calculatedVarCosts.cardFees > 0 ? 'text-red-200' : 'text-white/60'}`}>
                            {calculatedVarCosts.cardFees > 0 ? '-' : ''}{formatCurrency(calculatedVarCosts.cardFees)}
                          </span>
                        </div>
                      )}
                      
                      {/* Commissions */}
                      <div className="flex items-center justify-between pl-3">
                        <span className="text-white/80 text-xs">• Comissões</span>
                        <span className={`text-sm font-medium ${calculatedVarCosts.commissions > 0 ? 'text-red-200' : 'text-white/60'}`}>
                          {calculatedVarCosts.commissions > 0 ? '-' : ''}{formatCurrency(calculatedVarCosts.commissions)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between pt-2 border-t border-white/20">
                        <span className="text-white text-sm font-semibold">Subtotal Descontado</span>
                        <span className={`text-base font-bold ${calculatedVarCosts.total > 0 ? 'text-red-300' : 'text-white/60'}`}>
                          {calculatedVarCosts.total > 0 ? '-' : ''}{formatCurrency(calculatedVarCosts.total)}
                        </span>
                      </div>
                      
                      {calculatedVarCosts.total === 0 && (
                        <div className="text-xs text-yellow-300/80 mt-2 px-3">
                          ⚠️ Nenhum custo variável configurado
                        </div>
                      )}
                    </div>
                    
                    {/* Step 3: Net Revenue */}
                    <div className="bg-green-500/20 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-white text-sm font-medium">3️⃣ Receita Líquida</span>
                        <span className="text-xl font-bold text-green-200">
                          {formatCurrency(netRevenue)}
                        </span>
                      </div>
                      <div className="text-xs text-white/70 mt-1">
                        ({formatNumber((netRevenue / finalPrice) * 100, 1)}% do preço de venda)
                      </div>
                    </div>
                    
                    {/* Step 4: Direct Costs */}
                    {totalCost > 0 && (
                      <div className="bg-orange-500/20 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-white text-sm font-medium flex items-center gap-1">
                            4️⃣ Custos Diretos
                          </span>
                          <span className="text-lg font-semibold text-orange-200">
                            -{formatCurrency(totalCost)}
                          </span>
                        </div>
                        <div className="text-xs text-white/70 mt-1">
                          (Insumos + Hora de Trabalho)
                        </div>
                      </div>
                    )}
                    
                    {/* Step 5: Final Profit */}
                    <div className={`rounded-lg p-4 ${
                      margin.value >= 0 ? 'bg-green-600/30' : 'bg-red-600/30'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white text-sm font-bold flex items-center gap-1">
                          <TrendingUp className="h-4 w-4" />
                          5️⃣ LUCRO FINAL
                        </span>
                        <span
                          className={`text-lg font-bold ${
                            margin.value >= 0 ? 'text-green-200' : 'text-red-200'
                          }`}
                        >
                          {margin.percent >= 0 ? '+' : ''}{formatNumber(margin.percent, 1)}%
                        </span>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-3xl font-bold ${
                            margin.value >= 0 ? 'text-green-100' : 'text-red-100'
                          }`}
                        >
                          {formatCurrency(margin.value)}
                        </span>
                      </div>
                    </div>
                  </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  onClick={resetForm}
                  variant="outline"
                  className="flex-1 bg-white dark:bg-gray-900/10 border-white/30 text-white hover:bg-white dark:bg-gray-900/20"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  className="flex-1 bg-white dark:bg-gray-900 text-purple-700 hover:bg-purple-50 font-semibold"
                >
                  {editingId ? 'Atualizar' : 'Salvar'} Pacote
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Active Packages List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Pacotes Ativos</h2>

        {packages.length === 0 ? (
          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">Nenhum pacote cadastrado ainda.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {packages.map((pkg, index) => {
              const pkgCost = pkg.items.reduce((sum, item) => {
                return sum + calculateProcedureCost(item.procedure) * item.quantity;
              }, 0);
              const pkgProfit = pkg.finalPrice - pkgCost;
              const pkgMargin = pkgCost > 0 ? (pkgProfit / pkgCost) * 100 : 0;

              return (
                <motion.div
                  key={pkg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                >
                  <Card className="border-purple-200 hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                            {pkg.name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {pkg.items.length} {pkg.items.length === 1 ? 'procedimento' : 'procedimentos'}
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            onClick={() => editPackage(pkg)}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deletePackage(pkg.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4 mb-4">
                        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                          <p className="text-xs text-purple-700 dark:text-purple-300 mb-1">Preço Final</p>
                          <p className="text-xl font-bold text-purple-800 dark:text-purple-200">
                            {formatCurrency(pkg.finalPrice)}
                          </p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                          <p className="text-xs text-green-700 dark:text-green-300 mb-1">Desconto</p>
                          <p className="text-xl font-bold text-green-800 dark:text-green-200">
                            {formatNumber(pkg.discountPercent, 1)}% OFF
                          </p>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                          <p className="text-xs text-blue-700 dark:text-blue-300 mb-1">Margem</p>
                          <p
                            className={`text-xl font-bold ${
                              pkgMargin >= 0 ? 'text-blue-800 dark:text-blue-200' : 'text-red-800 dark:text-red-200'
                            }`}
                          >
                            {pkgMargin >= 0 ? '+' : ''}{formatNumber(pkgMargin, 1)}%
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Procedimentos inclusos:</p>
                        <div className="flex flex-wrap gap-2">
                          {pkg.items.map((item) => (
                            <span
                              key={item.procedure.id}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-xs"
                            >
                              {item.procedure.name}
                              {item.quantity > 1 && (
                                <span className="text-purple-600 font-semibold">
                                  x{item.quantity}
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
