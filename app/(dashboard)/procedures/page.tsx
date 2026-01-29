'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  Trash2,
  Edit2,
  Stethoscope,
  X,
  TrendingUp,
  Package,
  Users,
  DollarSign,
  Percent,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Supply {
  id: string;
  name: string;
  unit: string;
  costPerUnit: number;
}

interface Collaborator {
  id: string;
  name: string;
  role: string;
  hourlyCost: number;
}

interface ProcedureSupply {
  supplyId: string;
  quantity: number;
  supply?: Supply;
}

interface ProcedureCollaborator {
  collaboratorId: string;
  timeMinutes: number;
  collaborator?: Collaborator;
}

interface Procedure {
  id: string;
  name: string;
  price: number;
  duration: number;
  supplies?: ProcedureSupply[];
  collaborators?: ProcedureCollaborator[];
}

interface VariableCost {
  id: string;
  description: string;
  category: string;
  percentage: number;
}

export default function ProceduresPage() {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [variableCosts, setVariableCosts] = useState<VariableCost[]>([]);
  const [taxBurden, setTaxBurden] = useState(0);
  const [loading, setLoading] = useState(true);
  const [costsLoaded, setCostsLoaded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProcedure, setEditingProcedure] = useState<Procedure | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    duration: '',
  });
  const [selectedSupplies, setSelectedSupplies] = useState<ProcedureSupply[]>([]);
  const [selectedCollaborators, setSelectedCollaborators] = useState<ProcedureCollaborator[]>([]);

  // Markup percentage for bidirectional calculation
  const [markupPercent, setMarkupPercent] = useState<string>('');

  // Payment method for financial analysis
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH_PIX');
  const [installments, setInstallments] = useState<number>(1);
  const [cardFeeRules, setCardFeeRules] = useState<any[]>([]);
  
  // Calculated variable costs state
  const [calculatedCosts, setCalculatedCosts] = useState<{
    taxCosts: number;
    cardCosts: number;
    cardCostPercentage: number;
    commissionCosts: number;
    variableCostsAmount: number;
  }>({ taxCosts: 0, cardCosts: 0, cardCostPercentage: 0, commissionCosts: 0, variableCostsAmount: 0 });

  // Temporary add state
  const [tempSupply, setTempSupply] = useState({ supplyId: '', quantity: '1' });
  const [tempCollaborator, setTempCollaborator] = useState({ collaboratorId: '', timeMinutes: '60' });

  const fetchData = async () => {
    try {
      const [procRes, supRes, collabRes, costsRes, cardFeesRes] = await Promise.all([
        fetch('/api/procedures'),
        fetch('/api/supplies'),
        fetch('/api/collaborators'),
        fetch('/api/costs/variable'),
        fetch('/api/costs/card-fees'),
      ]);

      if (procRes.ok) setProcedures(await procRes.json());
      if (supRes.ok) setSupplies(await supRes.json());
      if (collabRes.ok) setCollaborators(await collabRes.json());
      
      if (costsRes.ok) {
        const costsData = await costsRes.json();
        console.log('📊 Custos Variáveis Carregados (Procedures):', {
          total: costsData.costs?.length || 0,
          custos: costsData.costs,
          porcentagemTotal: costsData.totalPercentage
        });
        
        const costsArray = costsData.costs || [];
        setVariableCosts(costsArray);
        setTaxBurden(costsData.taxBurden || 0);
        setCostsLoaded(true);
        
        console.log('✅ State atualizado (Procedures):', {
          length: costsArray.length,
          loaded: true
        });
      } else {
        console.error('❌ Erro ao carregar custos variáveis:', await costsRes.text());
        setCostsLoaded(false);
      }

      if (cardFeesRes.ok) {
        const cardFeesData = await cardFeesRes.json();
        setCardFeeRules(cardFeesData.rules || []);
        console.log('💳 Card Fee Rules carregadas:', cardFeesData.rules);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setFormData({ name: '', price: '', duration: '' });
    setSelectedSupplies([]);
    setSelectedCollaborators([]);
    setTempSupply({ supplyId: '', quantity: '1' });
    setTempCollaborator({ collaboratorId: '', timeMinutes: '60' });
    setMarkupPercent('');
    setEditingProcedure(null);
  };

  // Handle price change - update markup percent
  const handlePriceChange = (value: string) => {
    setFormData({ ...formData, price: value });
    
    // Parse the value considering Brazilian format (comma as decimal separator)
    const price = parseFloat(value.replace(',', '.')) || 0;
    if (totalCost > 0 && price > 0) {
      const calculatedMarkup = ((price - totalCost) / totalCost) * 100;
      setMarkupPercent(formatNumber(calculatedMarkup, 1));
    } else {
      setMarkupPercent('');
    }
  };

  // Handle markup percent change - update price
  const handleMarkupChange = (value: string) => {
    setMarkupPercent(value);
    
    const markup = parseFloat(value.replace(',', '.')) || 0;
    if (totalCost > 0) {
      const calculatedPrice = totalCost * (1 + markup / 100);
      // Store the price without formatting to avoid parsing issues
      setFormData(prev => ({ ...prev, price: calculatedPrice.toFixed(2).replace('.', ',') }));
    }
  };

  const loadProcedureForEdit = (procedure: Procedure) => {
    setEditingProcedure(procedure);
    setFormData({
      name: procedure.name,
      price: procedure.price.toString(),
      duration: procedure.duration.toString(),
    });
    
    const loadedSupplies = procedure.supplies?.map((ps) => ({
      supplyId: ps.supplyId,
      quantity: ps.quantity,
      supply: supplies.find((s) => s.id === ps.supplyId),
    })) || [];
    
    const loadedCollaborators = procedure.collaborators?.map((pc) => ({
      collaboratorId: pc.collaboratorId,
      timeMinutes: pc.timeMinutes,
      collaborator: collaborators.find((c) => c.id === pc.collaboratorId),
    })) || [];
    
    setSelectedSupplies(loadedSupplies);
    setSelectedCollaborators(loadedCollaborators);
    
    // Calculate and set markup percent for editing
    const procSupplyCost = loadedSupplies.reduce((acc, ps) => {
      const supply = ps.supply || supplies.find((s) => s.id === ps.supplyId);
      return acc + (supply?.costPerUnit || 0) * ps.quantity;
    }, 0);
    const procLaborCost = loadedCollaborators.reduce((acc, pc) => {
      const collaborator = pc.collaborator || collaborators.find((c) => c.id === pc.collaboratorId);
      const hourlyRate = collaborator?.hourlyCost || 0;
      return acc + (hourlyRate * pc.timeMinutes) / 60;
    }, 0);
    const procTotalCost = procSupplyCost + procLaborCost;
    
    if (procTotalCost > 0 && procedure.price > 0) {
      const calculatedMarkup = ((procedure.price - procTotalCost) / procTotalCost) * 100;
      setMarkupPercent(formatNumber(calculatedMarkup, 1));
    } else {
      setMarkupPercent('');
    }
  };

  // Add supply to list
  const addSupply = () => {
    if (!tempSupply.supplyId) {
      toast.error('Selecione um insumo');
      return;
    }
    const supply = supplies.find((s) => s.id === tempSupply.supplyId);
    if (selectedSupplies.some((s) => s.supplyId === tempSupply.supplyId)) {
      toast.error('Insumo já adicionado');
      return;
    }
    setSelectedSupplies([
      ...selectedSupplies,
      {
        supplyId: tempSupply.supplyId,
        quantity: parseFloat(tempSupply.quantity) || 1,
        supply,
      },
    ]);
    setTempSupply({ supplyId: '', quantity: '1' });
  };

  // Add collaborator to list
  const addCollaborator = () => {
    if (!tempCollaborator.collaboratorId) {
      toast.error('Selecione um profissional');
      return;
    }
    const collaborator = collaborators.find((c) => c.id === tempCollaborator.collaboratorId);
    if (selectedCollaborators.some((c) => c.collaboratorId === tempCollaborator.collaboratorId)) {
      toast.error('Profissional já adicionado');
      return;
    }
    setSelectedCollaborators([
      ...selectedCollaborators,
      {
        collaboratorId: tempCollaborator.collaboratorId,
        timeMinutes: parseInt(tempCollaborator.timeMinutes) || 60,
        collaborator,
      },
    ]);
    setTempCollaborator({ collaboratorId: '', timeMinutes: '60' });
  };

  const removeSupply = (supplyId: string) => {
    setSelectedSupplies(selectedSupplies.filter((s) => s.supplyId !== supplyId));
  };

  const removeCollaborator = (collaboratorId: string) => {
    setSelectedCollaborators(
      selectedCollaborators.filter((c) => c.collaboratorId !== collaboratorId)
    );
  };

  // Calculate costs
  const supplyCost = selectedSupplies.reduce((acc, ps) => {
    const supply = ps.supply || supplies.find((s) => s.id === ps.supplyId);
    return acc + (supply?.costPerUnit || 0) * ps.quantity;
  }, 0);

  const laborCost = selectedCollaborators.reduce((acc, pc) => {
    const collaborator = pc.collaborator || collaborators.find((c) => c.id === pc.collaboratorId);
    const hourlyRate = collaborator?.hourlyCost || 0;
    return acc + (hourlyRate * pc.timeMinutes) / 60;
  }, 0);

  const totalCost = supplyCost + laborCost;
  const salePrice = parseFloat(formData.price.replace(',', '.')) || 0;
  
  // Calculate variable costs whenever dependencies change
  useEffect(() => {
    console.log('🧮 [useEffect] Calculando Custos (Procedures):', {
      salePrice,
      costsLoaded,
      variableCostsLength: variableCosts.length,
      paymentMethod
    });
    
    // If costs not loaded, return zeros
    if (!costsLoaded || variableCosts.length === 0) {
      console.warn('⚠️ [useEffect] Custos não carregados (Procedures)');
      setCalculatedCosts({
        taxCosts: 0,
        cardCosts: 0,
        cardCostPercentage: 0,
        commissionCosts: 0,
        variableCostsAmount: 0
      });
      return;
    }
    
    // Calculate taxes
    const taxes = variableCosts
      .filter(c => c.category === 'TAX')
      .reduce((sum, c) => sum + (salePrice * c.percentage) / 100, 0);
    
    console.log('💰 [useEffect] Impostos (Procedures):', taxes);
    
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
        cardFees = (salePrice * cardFeePercentage) / 100;
        console.log('💳 [useEffect] Regra encontrada:', {
          parcelas: installments,
          percentual: cardFeePercentage,
          valor: cardFees
        });
      }
    }
    
    console.log('💳 [useEffect] Taxas de Cartão (Procedures):', cardFees);
    
    // Calculate commissions
    const commissions = variableCosts
      .filter(c => c.category === 'COMMISSION')
      .reduce((sum, c) => sum + (salePrice * c.percentage) / 100, 0);
    
    console.log('🤝 [useEffect] Comissões (Procedures):', commissions);
    
    const total = taxes + cardFees + commissions;
    
    console.log('📊 [useEffect] TOTAL (Procedures):', total);
    
    setCalculatedCosts({
      taxCosts: taxes,
      cardCosts: cardFees,
      cardCostPercentage: cardFeePercentage,
      commissionCosts: commissions,
      variableCostsAmount: total
    });
  }, [variableCosts, salePrice, paymentMethod, installments, cardFeeRules, costsLoaded]);
  
  // Net revenue after deducting variable costs
  const netRevenue = salePrice - calculatedCosts.variableCostsAmount;
  
  // Profit after all costs (both direct and variable)
  const profit = netRevenue - totalCost;
  const profitMargin = netRevenue > 0 ? (profit / netRevenue) * 100 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.price) {
      toast.error('Preencha o nome e o preço do procedimento');
      return;
    }

    try {
      const url = editingProcedure
        ? `/api/procedures/${editingProcedure.id}`
        : '/api/procedures';
      const method = editingProcedure ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          duration: parseInt(formData.duration) || 0,
          supplies: selectedSupplies.map((s) => ({
            supplyId: s.supplyId,
            quantity: s.quantity,
          })),
          collaborators: selectedCollaborators.map((c) => ({
            collaboratorId: c.collaboratorId,
            timeMinutes: c.timeMinutes,
          })),
        }),
      });

      if (res.ok) {
        toast.success(
          editingProcedure
            ? 'Procedimento atualizado com sucesso!'
            : 'Procedimento cadastrado com sucesso!'
        );
        resetForm();
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erro ao salvar procedimento');
      }
    } catch (error) {
      console.error('Error saving procedure:', error);
      toast.error('Erro ao salvar procedimento');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este procedimento?')) return;

    try {
      const res = await fetch(`/api/procedures/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Procedimento excluído com sucesso!');
        fetchData();
      } else {
        toast.error('Erro ao excluir procedimento');
      }
    } catch (error) {
      console.error('Error deleting procedure:', error);
      toast.error('Erro ao excluir procedimento');
    }
  };

  const filteredProcedures = procedures.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Procedimentos</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Cadastre os procedimentos realizados na clínica e seus custos operacionais.
        </p>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Form */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{editingProcedure ? 'Editar Procedimento' : 'Novo Procedimento'}</span>
                {editingProcedure && (
                  <Button variant="ghost" size="sm" onClick={resetForm}>
                    Cancelar edição
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2 lg:col-span-2">
                    <Label>Nome do Procedimento *</Label>
                    <Input
                      placeholder="Ex: Botox, Drenagem..."
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Preço Unitário (R$) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      value={formData.price}
                      onChange={(e) => handlePriceChange(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Duração (min)</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="60"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    />
                  </div>
                </div>

                {/* Bidirectional Markup Field */}
                <div className="border border-purple-200 dark:border-purple-800 rounded-lg p-4 bg-purple-50 dark:bg-purple-900/10">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                    <h3 className="font-semibold text-purple-900 dark:text-purple-100">Precificação Inteligente</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Markup sobre Custo (%)</Label>
                      <Input
                        type="text"
                        placeholder="Ex: 50,0"
                        value={markupPercent}
                        onChange={(e) => {
                          // Permite apenas números, vírgulas e pontos
                          const value = e.target.value.replace(/[^\d,\.]/g, '');
                          handleMarkupChange(value);
                        }}
                        className="border-purple-300 dark:border-purple-700"
                      />
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        💡 Ajuste o markup % e o preço será calculado automaticamente
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Custo Total Estimado</Label>
                      <div className="h-10 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 flex items-center">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {formatCurrency(totalCost)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Base para cálculo do markup
                      </p>
                    </div>
                  </div>
                </div>

                {/* Supplies Section */}
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-purple-700">
                    <Package className="h-5 w-5" />
                    <h3 className="font-semibold">Insumos (Custos Variáveis)</h3>
                  </div>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label className="text-xs">Selecione o insumo</Label>
                      <Select
                        value={tempSupply.supplyId}
                        onValueChange={(value) => setTempSupply({ ...tempSupply, supplyId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {supplies.map((supply) => (
                            <SelectItem key={supply.id} value={supply.id}>
                              {supply.name} ({formatCurrency(supply.costPerUnit)}/{supply.unit})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-24">
                      <Label className="text-xs">Qtd</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={tempSupply.quantity}
                        onChange={(e) => setTempSupply({ ...tempSupply, quantity: e.target.value })}
                      />
                    </div>
                    <Button type="button" onClick={addSupply} size="icon" className="bg-purple-600 hover:bg-purple-700">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {selectedSupplies.length > 0 && (
                    <div className="space-y-2 mt-3">
                      {selectedSupplies.map((ps) => {
                        const supply = ps.supply || supplies.find((s) => s.id === ps.supplyId);
                        const cost = (supply?.costPerUnit || 0) * ps.quantity;
                        return (
                          <div
                            key={ps.supplyId}
                            className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded"
                          >
                            <span className="text-sm">
                              {supply?.name} x {ps.quantity}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-purple-700">
                                {formatCurrency(cost)}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => removeSupply(ps.supplyId)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {selectedSupplies.length === 0 && (
                    <p className="text-sm text-gray-400 italic">Nenhum insumo adicionado ao procedimento.</p>
                  )}
                </div>

                {/* Collaborators Section */}
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-purple-700">
                    <Users className="h-5 w-5" />
                    <h3 className="font-semibold">Mão de Obra (Técnica)</h3>
                  </div>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label className="text-xs">Selecione o profissional</Label>
                      <Select
                        value={tempCollaborator.collaboratorId}
                        onValueChange={(value) =>
                          setTempCollaborator({ ...tempCollaborator, collaboratorId: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {collaborators.map((collab) => (
                            <SelectItem key={collab.id} value={collab.id}>
                              {collab.name} - {collab.role} ({formatCurrency(collab.hourlyCost)}/h)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-24">
                      <Label className="text-xs">Min</Label>
                      <Input
                        type="number"
                        min="1"
                        value={tempCollaborator.timeMinutes}
                        onChange={(e) =>
                          setTempCollaborator({ ...tempCollaborator, timeMinutes: e.target.value })
                        }
                      />
                    </div>
                    <Button type="button" onClick={addCollaborator} size="icon" className="bg-purple-600 hover:bg-purple-700">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {selectedCollaborators.length > 0 && (
                    <div className="space-y-2 mt-3">
                      {selectedCollaborators.map((pc) => {
                        const collaborator =
                          pc.collaborator || collaborators.find((c) => c.id === pc.collaboratorId);
                        const cost = ((collaborator?.hourlyCost || 0) * pc.timeMinutes) / 60;
                        return (
                          <div
                            key={pc.collaboratorId}
                            className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded"
                          >
                            <span className="text-sm">
                              {collaborator?.name} ({pc.timeMinutes} min)
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-purple-700">
                                {formatCurrency(cost)}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => removeCollaborator(pc.collaboratorId)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {selectedCollaborators.length === 0 && (
                    <p className="text-sm text-gray-400 italic">
                      Nenhum profissional alocado ao procedimento.
                    </p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button type="submit" className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white">
                    {editingProcedure ? 'Salvar Alterações' : 'Salvar Procedimento'}
                  </Button>
                  {editingProcedure && (
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Profitability Summary */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg p-4 sm:p-6 text-white shadow-lg sticky top-6">
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
              <Label htmlFor="payment-method-selector" className="text-white/90 text-sm mb-2 block">
                Modalidade de Pagamento
              </Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger 
                  id="payment-method-selector"
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
                <Label htmlFor="installments-selector" className="text-white/90 text-sm mb-2 block">
                  Número de Parcelas
                </Label>
                <Select 
                  value={installments.toString()} 
                  onValueChange={(value) => setInstallments(parseInt(value))}
                >
                  <SelectTrigger 
                    id="installments-selector"
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
                {calculatedCosts.cardCostPercentage > 0 && (
                  <p className="text-xs text-yellow-300 mt-1">
                    Taxa aplicada: {formatNumber(calculatedCosts.cardCostPercentage, 2)}%
                  </p>
                )}
              </div>
            )}

            <div className="space-y-4">
              {/* Detailed Financial Flow */}
              {salePrice > 0 ? (
                <div className="space-y-3">
                  <div className="text-sm font-bold text-white mb-3">📊 Fluxo de Cálculo Detalhado</div>
                  
                  {/* Step 1: Sale Price */}
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-white/90 text-sm font-medium">1️⃣ Preço de Venda</span>
                      <span className="text-lg font-bold text-white">
                        {formatCurrency(salePrice)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Step 2: Variable Costs Breakdown - ALWAYS SHOW */}
                  <div className="bg-red-500/20 rounded-lg p-3 space-y-2">
                    <div className="text-white/90 text-sm font-medium mb-2">2️⃣ Descontos sobre Venda</div>
                    
                    {/* Taxes */}
                    <div className="flex items-center justify-between pl-3">
                      <span className="text-white/80 text-xs">• Impostos</span>
                      <span className={`text-sm font-medium ${calculatedCosts.taxCosts > 0 ? 'text-red-200' : 'text-white/60'}`}>
                        {calculatedCosts.taxCosts > 0 ? '-' : ''}{formatCurrency(calculatedCosts.taxCosts)}
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
                          • {paymentMethod === 'CREDIT_CARD' && `Taxa Crédito ${installments}x (${formatNumber(calculatedCosts.cardCostPercentage, 2)}%)`}
                          {paymentMethod === 'DEBIT_CARD' && 'Taxa Débito'}
                          {paymentMethod === 'BOLETO' && 'Taxa Boleto'}
                        </span>
                        <span className={`text-sm font-medium ${calculatedCosts.cardCosts > 0 ? 'text-red-200' : 'text-white/60'}`}>
                          {calculatedCosts.cardCosts > 0 ? '-' : ''}{formatCurrency(calculatedCosts.cardCosts)}
                        </span>
                      </div>
                    )}
                    
                    {/* Commissions */}
                    <div className="flex items-center justify-between pl-3">
                      <span className="text-white/80 text-xs">• Comissões</span>
                      <span className={`text-sm font-medium ${calculatedCosts.commissionCosts > 0 ? 'text-red-200' : 'text-white/60'}`}>
                        {calculatedCosts.commissionCosts > 0 ? '-' : ''}{formatCurrency(calculatedCosts.commissionCosts)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between pt-2 border-t border-white/20">
                      <span className="text-white text-sm font-semibold">Subtotal Descontado</span>
                      <span className={`text-base font-bold ${calculatedCosts.variableCostsAmount > 0 ? 'text-red-300' : 'text-white/60'}`}>
                        {calculatedCosts.variableCostsAmount > 0 ? '-' : ''}{formatCurrency(calculatedCosts.variableCostsAmount)}
                      </span>
                    </div>
                    
                    {calculatedCosts.variableCostsAmount === 0 && (
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
                      ({formatNumber((netRevenue / salePrice) * 100 || 0, 1)}% do preço de venda)
                    </div>
                  </div>
                  
                  {/* Step 4: Direct Costs */}
                  {totalCost > 0 && (
                    <div className="bg-orange-500/20 rounded-lg p-3 space-y-2">
                      <div className="text-white/90 text-sm font-medium mb-2">4️⃣ Custos Diretos</div>
                      
                      {supplyCost > 0 && (
                        <div className="flex items-center justify-between pl-3">
                          <span className="text-white/80 text-xs flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            • Insumos
                          </span>
                          <span className="text-sm font-medium text-orange-200">
                            -{formatCurrency(supplyCost)}
                          </span>
                        </div>
                      )}
                      
                      {laborCost > 0 && (
                        <div className="flex items-center justify-between pl-3">
                          <span className="text-white/80 text-xs flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            • Mão de Obra
                          </span>
                          <span className="text-sm font-medium text-orange-200">
                            -{formatCurrency(laborCost)}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between pt-2 border-t border-white/20">
                        <span className="text-white text-sm font-semibold">Subtotal Diretos</span>
                        <span className="text-base font-bold text-orange-300">
                          -{formatCurrency(totalCost)}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Step 5: Final Profit */}
                  <div className={`rounded-lg p-4 ${
                    profit >= 0 ? 'bg-green-600/30' : 'bg-red-600/30'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white text-sm font-bold flex items-center gap-1">
                        <TrendingUp className="h-4 w-4" />
                        5️⃣ LUCRO FINAL
                      </span>
                      <span
                        className={`text-lg font-bold ${
                          profitMargin >= 0 ? 'text-green-200' : 'text-red-200'
                        }`}
                      >
                        {profitMargin >= 0 ? '+' : ''}{formatNumber(profitMargin, 1)}%
                      </span>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-3xl font-bold ${
                          profit >= 0 ? 'text-green-100' : 'text-red-100'
                        }`}
                      >
                        {formatCurrency(profit)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-white/60 text-sm">
                  Preencha o preço e os custos para ver a análise financeira
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Procedures Catalog */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>Catálogo de Procedimentos</CardTitle>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : filteredProcedures.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
              <Stethoscope className="h-12 w-12 mb-4 text-gray-300" />
              <p>Nenhum procedimento cadastrado ainda.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-center">Insumos</TableHead>
                  <TableHead className="text-center">Profissionais</TableHead>
                  <TableHead className="text-right">Preço Venda</TableHead>
                  <TableHead className="text-center">Margem Est.</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProcedures.map((procedure) => {
                  const procSupplyCost = (procedure.supplies || []).reduce((acc, ps) => {
                    const supply = supplies.find((s) => s.id === ps.supplyId);
                    return acc + (supply?.costPerUnit || 0) * ps.quantity;
                  }, 0);
                  const procLaborCost = (procedure.collaborators || []).reduce((acc, pc) => {
                    const collab = collaborators.find((c) => c.id === pc.collaboratorId);
                    return acc + ((collab?.hourlyCost || 0) * pc.timeMinutes) / 60;
                  }, 0);
                  const procProfit = procedure.price - procSupplyCost - procLaborCost;
                  const procMargin =
                    procedure.price > 0 ? (procProfit / procedure.price) * 100 : 0;

                  return (
                    <TableRow key={procedure.id}>
                      <TableCell className="font-medium">{procedure.name}</TableCell>
                      <TableCell className="text-center">
                        {procedure.supplies?.length || 0}
                      </TableCell>
                      <TableCell className="text-center">
                        {procedure.collaborators?.length || 0}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(procedure.price)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            procMargin >= 30 ? 'default' : procMargin >= 0 ? 'secondary' : 'destructive'
                          }
                          className={procMargin >= 30 ? 'bg-green-500' : ''}
                        >
                          {formatNumber(procMargin, 1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => loadProcedureForEdit(procedure)}
                            className="h-8 w-8 text-gray-500 dark:text-gray-400 hover:text-purple-600"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(procedure.id)}
                            className="h-8 w-8 text-gray-500 dark:text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
