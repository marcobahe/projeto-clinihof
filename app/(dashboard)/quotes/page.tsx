'use client';

import { useState, useEffect } from 'react';
import { Plus, TrendingUp, DollarSign, CheckCircle, XCircle, Clock, FileText, Search, Filter, Download, Settings, Edit2, Trash2, Copy, Package, Percent } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { useCountUp } from '@/hooks/use-count-up';
import { QuoteSettingsModal } from '@/components/quote-settings-modal';

interface Patient {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

interface Procedure {
  id: string;
  name: string;
  price: number;
}

interface QuoteItem {
  id?: string;
  procedureId?: string;
  packageId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  originalPrice?: number;
  savingsAmount?: number;
  savingsPercent?: number;
  procedure?: Procedure;
  package?: PackageInfo;
}

interface PackageInfo {
  id: string;
  name: string;
  finalPrice: number;
  discountPercent: number;
  items?: { procedureId: string; quantity: number; procedure?: Procedure }[];
}

interface Quote {
  id: string;
  title: string;
  patient: Patient;
  collaborator?: Collaborator;
  totalAmount: number;
  discountPercent: number;
  discountAmount: number;
  finalAmount: number;
  status: 'PENDING' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  leadSource?: string;
  notes?: string;
  createdDate: string;
  sentDate?: string;
  expirationDate?: string;
  acceptedDate?: string;
  items: QuoteItem[];
}

interface QuoteStats {
  summary: {
    totalQuotes: number;
    pendingQuotes: number;
    acceptedQuotes: number;
    rejectedQuotes: number;
    conversionRate: number;
    avgResponseTimeDays: number;
  };
  values: {
    totalValue: number;
    acceptedValue: number;
    pendingValue: number;
    lostValue: number;
  };
}

interface Collaborator {
  id: string;
  name: string;
}

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [stats, setStats] = useState<QuoteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPartialModalOpen, setIsPartialModalOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [packages, setPackages] = useState<PackageInfo[]>([]);

  // Form state for creating/editing quote
  const [formData, setFormData] = useState({
    patientId: '',
    collaboratorId: '',
    title: '',
    leadSource: '',
    notes: '',
    expirationDate: '',
    discountPercent: '',
    discountAmount: '',
    items: [] as QuoteItem[]
  });

  // Partial conversion state
  const [partialSelectedItems, setPartialSelectedItems] = useState<string[]>([]);

  // Form state for converting quote to sale
  const [paymentSplits, setPaymentSplits] = useState([{
    paymentMethod: 'CASH_PIX',
    amount: 0,
    installments: 1
  }]);

  useEffect(() => {
    fetchQuotes();
    fetchPatients();
    fetchProcedures();
    fetchCollaborators();
    fetchPackages();
    fetchStats();
  }, []);

  const fetchQuotes = async () => {
    try {
      const res = await fetch('/api/quotes');
      if (res.ok) {
        const data = await res.json();
        setQuotes(data.quotes);
      }
    } catch (error) {
      console.error('Error fetching quotes:', error);
      toast.error('Erro ao carregar orçamentos');
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const res = await fetch('/api/patients');
      if (res.ok) {
        const data = await res.json();
        setPatients(data);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const fetchProcedures = async () => {
    try {
      const res = await fetch('/api/procedures');
      if (res.ok) {
        const data = await res.json();
        setProcedures(data);
      }
    } catch (error) {
      console.error('Error fetching procedures:', error);
    }
  };

  const fetchCollaborators = async () => {
    try {
      const res = await fetch('/api/collaborators');
      if (res.ok) {
        const data = await res.json();
        setCollaborators(data);
      }
    } catch (error) {
      console.error('Error fetching collaborators:', error);
    }
  };

  const fetchPackages = async () => {
    try {
      const res = await fetch('/api/packages');
      if (res.ok) {
        const data = await res.json();
        setPackages(data);
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/quotes/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { description: '', quantity: 1, unitPrice: 0, totalPrice: 0 }
      ]
    }));
  };

  const handleRemoveItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      
      // Recalculate total price
      if (field === 'quantity' || field === 'unitPrice') {
        newItems[index].totalPrice = newItems[index].quantity * newItems[index].unitPrice;
      }
      
      return { ...prev, items: newItems };
    });
  };

  const handleProcedureSelect = (index: number, procedureId: string) => {
    const procedure = procedures.find(p => p.id === procedureId);
    if (procedure) {
      handleItemChange(index, 'procedureId', procedureId);
      handleItemChange(index, 'description', procedure.name);
      handleItemChange(index, 'unitPrice', procedure.price);
      handleItemChange(index, 'totalPrice', formData.items[index].quantity * procedure.price);
    }
  };

  const handleCreateQuote = async () => {
    if (!formData.patientId || !formData.title || formData.items.length === 0) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    // Calcular totais com desconto
    const totalAmount = formData.items.reduce((sum, item) => sum + item.totalPrice, 0);
    let discountAmount = parseFloat(formData.discountAmount) || 0;
    let discountPercent = parseFloat(formData.discountPercent) || 0;
    
    if (discountPercent > 0 && discountAmount === 0) {
      discountAmount = (totalAmount * discountPercent) / 100;
    } else if (discountAmount > 0 && discountPercent === 0) {
      discountPercent = (discountAmount / totalAmount) * 100;
    }
    const finalAmount = totalAmount - discountAmount;

    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          totalAmount,
          discountPercent,
          discountAmount,
          finalAmount
        })
      });

      if (res.ok) {
        toast.success('Orçamento criado com sucesso');
        setIsCreateModalOpen(false);
        fetchQuotes();
        fetchStats();
        // Reset form
        setFormData({
          patientId: '',
          collaboratorId: '',
          title: '',
          leadSource: '',
          notes: '',
          expirationDate: '',
          items: []
        });
      } else {
        const error = await res.json();
        toast.error(error.error || 'Erro ao criar orçamento');
      }
    } catch (error) {
      console.error('Error creating quote:', error);
      toast.error('Erro ao criar orçamento');
    }
  };

  const handleUpdateStatus = async (quoteId: string, status: string) => {
    try {
      const res = await fetch(`/api/quotes/${quoteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (res.ok) {
        toast.success('Status atualizado com sucesso');
        fetchQuotes();
        fetchStats();
      } else {
        toast.error('Erro ao atualizar status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const handleDownloadPDF = async (quoteId: string) => {
    try {
      const res = await fetch(`/api/quotes/${quoteId}/pdf`);
      
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `orcamento-${quoteId.substring(0, 8)}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('PDF baixado com sucesso');
      } else {
        toast.error('Erro ao gerar PDF');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Erro ao baixar PDF');
    }
  };

  const handleConvertToSale = async () => {
    if (!selectedQuote) return;

    // Validate payment splits
    const totalSplitAmount = paymentSplits.reduce((sum, split) => sum + split.amount, 0);
    if (Math.abs(totalSplitAmount - selectedQuote.finalAmount) > 0.01) {
      toast.error(`Total dos pagamentos deve ser ${formatCurrency(selectedQuote.finalAmount)}`);
      return;
    }

    try {
      const res = await fetch(`/api/quotes/${selectedQuote.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentSplits,
          saleDate: new Date().toISOString(),
          discountPercent: parseFloat((formData as any).convertDiscountPercent) || 0,
          discountAmount: parseFloat((formData as any).convertDiscountAmount) || 0,
          cardFeePercent: parseFloat((formData as any).convertCardFee) || null,
          taxRate: parseFloat((formData as any).convertTaxRate) || null
        })
      });

      if (res.ok) {
        toast.success('Orçamento convertido em venda com sucesso!');
        setIsConvertModalOpen(false);
        setSelectedQuote(null);
        fetchQuotes();
        fetchStats();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Erro ao converter orçamento');
      }
    } catch (error) {
      console.error('Error converting quote:', error);
      toast.error('Erro ao converter orçamento');
    }
  };

  const openConvertModal = (quote: Quote) => {
    setSelectedQuote(quote);
    setPaymentSplits([{
      paymentMethod: 'CASH_PIX',
      amount: quote.finalAmount,
      installments: 1
    }]);
    setIsConvertModalOpen(true);
  };

  // ===== EDITAR ORÇAMENTO =====
  const handleEditQuote = (quote: Quote) => {
    setEditingQuote(quote);
    setFormData({
      patientId: quote.patient.id,
      collaboratorId: quote.collaborator?.id || '',
      title: quote.title,
      leadSource: quote.leadSource || '',
      notes: quote.notes || '',
      expirationDate: quote.expirationDate ? quote.expirationDate.split('T')[0] : '',
      discountPercent: quote.discountPercent ? quote.discountPercent.toString() : '',
      discountAmount: quote.discountAmount ? quote.discountAmount.toString() : '',
      items: quote.items.map(item => ({
        id: item.id,
        procedureId: item.procedureId,
        packageId: item.packageId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice
      }))
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEditQuote = async () => {
    if (!editingQuote) return;
    
    const totalAmount = formData.items.reduce((sum, item) => sum + item.totalPrice, 0);
    let discountAmount = parseFloat(formData.discountAmount) || 0;
    let discountPercent = parseFloat(formData.discountPercent) || 0;
    
    if (discountPercent > 0 && discountAmount === 0) {
      discountAmount = (totalAmount * discountPercent) / 100;
    } else if (discountAmount > 0 && discountPercent === 0) {
      discountPercent = totalAmount > 0 ? (discountAmount / totalAmount) * 100 : 0;
    }

    try {
      const res = await fetch(`/api/quotes/${editingQuote.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          collaboratorId: formData.collaboratorId || null,
          notes: formData.notes,
          leadSource: formData.leadSource,
          discountPercent,
          discountAmount,
          items: formData.items.map(item => ({
            procedureId: item.procedureId || null,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice
          }))
        })
      });

      if (res.ok) {
        toast.success('Orçamento atualizado!');
        setIsEditModalOpen(false);
        setEditingQuote(null);
        fetchQuotes();
        fetchStats();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Erro ao atualizar');
      }
    } catch (error) {
      toast.error('Erro ao atualizar orçamento');
    }
  };

  // ===== EXCLUIR ORÇAMENTO =====
  const handleDeleteQuote = async (quoteId: string) => {
    if (!confirm('Deseja realmente excluir este orçamento? Esta ação não pode ser desfeita.')) return;
    
    try {
      const res = await fetch(`/api/quotes/${quoteId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Orçamento excluído!');
        fetchQuotes();
        fetchStats();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Erro ao excluir');
      }
    } catch (error) {
      toast.error('Erro ao excluir orçamento');
    }
  };

  // ===== DUPLICAR ORÇAMENTO =====
  const handleDuplicateQuote = async (quoteId: string) => {
    try {
      const res = await fetch(`/api/quotes/${quoteId}/duplicate`, { method: 'POST' });
      if (res.ok) {
        toast.success('Orçamento duplicado!');
        fetchQuotes();
        fetchStats();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Erro ao duplicar');
      }
    } catch (error) {
      toast.error('Erro ao duplicar orçamento');
    }
  };

  // ===== ADICIONAR PACOTE AO ORÇAMENTO =====
  const handleAddPackage = (pkg: PackageInfo) => {
    // Calcular preço original (soma dos procedimentos)
    const originalPrice = pkg.items?.reduce((sum, pi) => {
      const proc = procedures.find(p => p.id === pi.procedureId);
      return sum + (proc ? proc.price * pi.quantity : 0);
    }, 0) || 0;
    const savingsAmount = originalPrice - pkg.finalPrice;
    const savingsPercent = originalPrice > 0 ? (savingsAmount / originalPrice) * 100 : 0;

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        packageId: pkg.id,
        description: `📦 ${pkg.name}`,
        quantity: 1,
        unitPrice: pkg.finalPrice,
        totalPrice: pkg.finalPrice,
        originalPrice,
        savingsAmount,
        savingsPercent
      }]
    }));
    toast.success(`Pacote "${pkg.name}" adicionado! Economia de ${formatCurrency(savingsAmount)}`);
  };

  // ===== FECHAMENTO PARCIAL =====
  const handlePartialConvert = async () => {
    if (!selectedQuote || partialSelectedItems.length === 0) {
      toast.error('Selecione pelo menos um item');
      return;
    }

    const selectedTotal = selectedQuote.items
      .filter(item => partialSelectedItems.includes(item.id))
      .reduce((sum, item) => sum + item.totalPrice, 0);

    const totalSplitAmount = paymentSplits.reduce((sum, split) => sum + split.amount, 0);
    if (Math.abs(totalSplitAmount - selectedTotal) > 0.01) {
      toast.error(`Total dos pagamentos deve ser ${formatCurrency(selectedTotal)}`);
      return;
    }

    try {
      const res = await fetch(`/api/quotes/${selectedQuote.id}/convert-partial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedItemIds: partialSelectedItems,
          paymentSplits,
          saleDate: new Date().toISOString()
        })
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(data.message);
        setIsPartialModalOpen(false);
        setSelectedQuote(null);
        setPartialSelectedItems([]);
        fetchQuotes();
        fetchStats();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Erro no fechamento parcial');
      }
    } catch (error) {
      toast.error('Erro no fechamento parcial');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: { variant: any; label: string; icon: any } } = {
      PENDING: { variant: 'default', label: 'Pendente', icon: Clock },
      SENT: { variant: 'default', label: 'Enviado', icon: FileText },
      ACCEPTED: { variant: 'default', label: 'Aceito', icon: CheckCircle },
      REJECTED: { variant: 'destructive', label: 'Rejeitado', icon: XCircle },
      EXPIRED: { variant: 'secondary', label: 'Expirado', icon: XCircle }
    };
    
    const { variant, label, icon: Icon } = variants[status] || variants.PENDING;
    
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  // Filter quotes
  const filteredQuotes = quotes.filter(quote => {
    const matchesStatus = filterStatus === 'all' || quote.status === filterStatus;
    const matchesSearch = 
      quote.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.patient.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Animated stats
  const animatedConversionRate = formatNumber(stats?.summary.conversionRate || 0, 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orçamentos</h1>
          <p className="text-muted-foreground">Gerencie propostas e acompanhe conversões</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsSettingsModalOpen(true)}
            title="Configurações de Orçamento"
          >
            <Settings className="h-4 w-4 mr-2" />
            Configurações
          </Button>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              Novo Orçamento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Novo Orçamento</DialogTitle>
              <DialogDescription>
                Preencha os dados do orçamento e adicione os procedimentos
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label>Paciente *</Label>
                <Select value={formData.patientId} onValueChange={(value) => setFormData(prev => ({ ...prev, patientId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um paciente" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map(patient => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.name} - {patient.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Profissional Responsável</Label>
                <Select value={formData.collaboratorId} onValueChange={(value) => setFormData(prev => ({ ...prev, collaboratorId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o profissional" />
                  </SelectTrigger>
                  <SelectContent>
                    {collaborators.map(collaborator => (
                      <SelectItem key={collaborator.id} value={collaborator.id}>
                        {collaborator.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Título do Orçamento *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Tratamento Facial Completo"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Origem do Lead</Label>
                  <Input
                    value={formData.leadSource}
                    onChange={(e) => setFormData(prev => ({ ...prev, leadSource: e.target.value }))}
                    placeholder="Ex: Instagram, Google, Indicação"
                  />
                </div>
                <div>
                  <Label>Data de Validade</Label>
                  <Input
                    type="date"
                    value={formData.expirationDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, expirationDate: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Observações sobre o orçamento..."
                  rows={3}
                />
              </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <Label>Itens do Orçamento *</Label>
                    <div className="flex gap-2">
                      {packages.length > 0 && (
                        <Select onValueChange={(value) => {
                          const pkg = packages.find(p => p.id === value);
                          if (pkg) handleAddPackage(pkg);
                        }}>
                          <SelectTrigger className="w-[180px]">
                            <Package className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Adicionar Pacote" />
                          </SelectTrigger>
                          <SelectContent>
                            {packages.filter(p => p.isActive !== false).map(pkg => (
                              <SelectItem key={pkg.id} value={pkg.id}>
                                {pkg.name} - {formatCurrency(pkg.finalPrice)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <Button type="button" size="sm" onClick={handleAddItem}>
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar Item
                      </Button>
                    </div>
                  </div>

                {formData.items.map((item, index) => (
                  <Card key={index} className="mb-3">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-6">
                          <Label>Procedimento</Label>
                          <Select
                            value={item.procedureId || ''}
                            onValueChange={(value) => handleProcedureSelect(index, value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione ou digite" />
                            </SelectTrigger>
                            <SelectContent>
                              {procedures.map(proc => (
                                <SelectItem key={proc.id} value={proc.id}>
                                  {proc.name} - {formatCurrency(proc.price)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            className="mt-2"
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            placeholder="Ou digite uma descrição"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label>Qtd</Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                          />
                        </div>
                        <div className="col-span-3">
                          <Label>Preço Unit.</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            placeholder="0,00"
                          />
                        </div>
                        <div className="col-span-1 flex items-end">
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRemoveItem(index)}
                          >
                            ×
                          </Button>
                        </div>
                      </div>
                      <div className="mt-2 text-right font-semibold">
                        Total: {formatCurrency(item.totalPrice)}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {formData.items.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum item adicionado. Clique em &quot;Adicionar Item&quot; para começar.
                  </div>
                )}

                {formData.items.length > 0 && (() => {
                  const subtotal = formData.items.reduce((sum, item) => sum + item.totalPrice, 0);
                  const discPct = parseFloat(formData.discountPercent) || 0;
                  const discAmt = parseFloat(formData.discountAmount) || 0;
                  const finalDiscAmt = discPct > 0 ? (subtotal * discPct / 100) : discAmt;
                  const finalTotal = subtotal - finalDiscAmt;
                  
                  return (
                    <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg space-y-3">
                      {/* Campos de desconto */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm">Desconto (%)</Label>
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              placeholder="0"
                              value={formData.discountPercent}
                              onChange={(e) => {
                                const val = e.target.value;
                                setFormData(prev => ({ ...prev, discountPercent: val, discountAmount: '' }));
                              }}
                            />
                            <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm">Desconto (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0,00"
                            value={formData.discountAmount}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormData(prev => ({ ...prev, discountAmount: val, discountPercent: '' }));
                            }}
                          />
                        </div>
                      </div>

                      {/* Exibir economia dos pacotes */}
                      {formData.items.some(item => (item as any).savingsAmount > 0) && (
                        <div className="text-sm text-green-600 font-medium">
                          📦 Economia com pacotes: {formatCurrency(formData.items.reduce((sum, item) => sum + ((item as any).savingsAmount || 0), 0))}
                        </div>
                      )}

                      <div className="flex justify-between items-center">
                        <div>
                          {finalDiscAmt > 0 && (
                            <p className="text-sm text-gray-500 line-through">{formatCurrency(subtotal)}</p>
                          )}
                          <span className="text-lg font-bold">Total Final:</span>
                        </div>
                        <span className="text-xl font-bold text-purple-600">
                          {formatCurrency(finalTotal)}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateQuote} className="bg-purple-600 hover:bg-purple-700">
                  Criar Orçamento
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Quote Settings Modal */}
      <QuoteSettingsModal open={isSettingsModalOpen} onOpenChange={setIsSettingsModalOpen} />

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Orçamentos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.summary.totalQuotes}</div>
              <p className="text-xs text-muted-foreground">
                {stats.summary.pendingQuotes} pendentes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{animatedConversionRate}%</div>
              <p className="text-xs text-muted-foreground">
                {stats.summary.acceptedQuotes} de {stats.summary.totalQuotes} aceitos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor em Orçamentos</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.values.pendingValue)}</div>
              <p className="text-xs text-muted-foreground">
                Pendente de conversão
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Convertido</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.values.acceptedValue)}</div>
              <p className="text-xs text-muted-foreground">
                Total de vendas convertidas
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por título ou paciente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="PENDING">Pendente</SelectItem>
                <SelectItem value="SENT">Enviado</SelectItem>
                <SelectItem value="ACCEPTED">Aceito</SelectItem>
                <SelectItem value="REJECTED">Rejeitado</SelectItem>
                <SelectItem value="EXPIRED">Expirado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Quotes List */}
      <div className="grid gap-4">
        {filteredQuotes.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum orçamento encontrado</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || filterStatus !== 'all'
                  ? 'Tente ajustar os filtros'
                  : 'Comece criando um novo orçamento'}
              </p>
              {!searchTerm && filterStatus === 'all' && (
                <Button onClick={() => setIsCreateModalOpen(true)} className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Orçamento
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredQuotes.map(quote => (
            <Card key={quote.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold">{quote.title}</h3>
                      {getStatusBadge(quote.status)}
                    </div>
                    <p className="text-muted-foreground mb-1">
                      <strong>Paciente:</strong> {quote.patient.name} - {quote.patient.phone}
                    </p>
                    {quote.collaborator && (
                      <p className="text-muted-foreground mb-1">
                        <strong>Profissional:</strong> {quote.collaborator.name}
                      </p>
                    )}
                    {quote.leadSource && (
                      <p className="text-muted-foreground mb-1">
                        <strong>Origem:</strong> {quote.leadSource}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Criado em {new Date(quote.createdDate).toLocaleDateString('pt-BR')}
                    </p>
                    
                    <div className="mt-4">
                      <p className="text-sm font-semibold mb-2">Itens:</p>
                      <ul className="space-y-1">
                        {quote.items.map((item, idx) => (
                          <li key={idx} className="text-sm text-muted-foreground">
                            • {item.description} - {item.quantity}x {formatCurrency(item.unitPrice)} = {formatCurrency(item.totalPrice)}
                            {(item as any).savingsAmount > 0 && (
                              <span className="ml-2 text-green-600 text-xs font-medium">
                                Economia de {formatCurrency((item as any).savingsAmount)} ({((item as any).savingsPercent || 0).toFixed(0)}%)
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  
                  <div className="text-right ml-6">
                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground">Valor Total</p>
                      {quote.discountAmount > 0 && (
                        <p className="text-sm line-through text-muted-foreground">
                          {formatCurrency(quote.totalAmount)}
                        </p>
                      )}
                      <p className="text-2xl font-bold text-purple-600">
                        {formatCurrency(quote.finalAmount)}
                      </p>
                      {quote.discountPercent > 0 && (
                        <p className="text-xs text-green-600">
                          {formatNumber(quote.discountPercent, 1)}% de desconto
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      {/* Ações gerais — sempre visíveis */}
                      <div className="grid grid-cols-3 gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditQuote(quote)}
                          className="w-full"
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDuplicateQuote(quote.id)}
                          className="w-full"
                          title="Duplicar"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteQuote(quote.id)}
                          className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadPDF(quote.id)}
                        className="w-full"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Baixar PDF
                      </Button>
                      
                      {quote.status === 'PENDING' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleUpdateStatus(quote.id, 'SENT')}
                            className="w-full"
                          >
                            Marcar como Enviado
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => openConvertModal(quote)}
                            className="w-full bg-green-600 hover:bg-green-700"
                          >
                            Converter em Venda
                          </Button>
                          {quote.items.length > 1 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedQuote(quote);
                                setPartialSelectedItems([]);
                                setPaymentSplits([{ paymentMethod: 'CASH_PIX', amount: 0, installments: 1 }]);
                                setIsPartialModalOpen(true);
                              }}
                              className="w-full border-green-600 text-green-600 hover:bg-green-50"
                            >
                              Fechar Parcial
                            </Button>
                          )}
                        </>
                      )}
                      {quote.status === 'SENT' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => openConvertModal(quote)}
                            className="w-full bg-green-600 hover:bg-green-700"
                          >
                            Converter em Venda
                          </Button>
                          {quote.items.length > 1 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedQuote(quote);
                                setPartialSelectedItems([]);
                                setPaymentSplits([{ paymentMethod: 'CASH_PIX', amount: 0, installments: 1 }]);
                                setIsPartialModalOpen(true);
                              }}
                              className="w-full border-green-600 text-green-600 hover:bg-green-50"
                            >
                              Fechar Parcial
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleUpdateStatus(quote.id, 'REJECTED')}
                            className="w-full"
                          >
                            Marcar como Rejeitado
                          </Button>
                        </>
                      )}
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Quote Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={(open) => {
        setIsEditModalOpen(open);
        if (!open) setEditingQuote(null);
      }}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Orçamento</DialogTitle>
            <DialogDescription>Atualize os dados e itens do orçamento</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input value={formData.title} onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))} />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} rows={2} />
            </div>

            {/* Itens */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-4">
                <Label>Itens</Label>
                <div className="flex gap-2">
                  {packages.length > 0 && (
                    <Select onValueChange={(value) => {
                      const pkg = packages.find(p => p.id === value);
                      if (pkg) handleAddPackage(pkg);
                    }}>
                      <SelectTrigger className="w-[180px]">
                        <Package className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Adicionar Pacote" />
                      </SelectTrigger>
                      <SelectContent>
                        {packages.filter(p => p.isActive !== false).map(pkg => (
                          <SelectItem key={pkg.id} value={pkg.id}>
                            {pkg.name} - {formatCurrency(pkg.finalPrice)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Button type="button" size="sm" onClick={handleAddItem}>
                    <Plus className="h-4 w-4 mr-1" /> Item
                  </Button>
                </div>
              </div>

              {formData.items.map((item, index) => (
                <Card key={index} className="mb-3">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-12 gap-3">
                      <div className="col-span-6">
                        <Label>Procedimento</Label>
                        <Select value={item.procedureId || ''} onValueChange={(value) => handleProcedureSelect(index, value)}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            {procedures.map(proc => (
                              <SelectItem key={proc.id} value={proc.id}>{proc.name} - {formatCurrency(proc.price)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input className="mt-2" value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} placeholder="Descrição" />
                      </div>
                      <div className="col-span-2">
                        <Label>Qtd</Label>
                        <Input type="number" min="1" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)} />
                      </div>
                      <div className="col-span-3">
                        <Label>Preço Unit.</Label>
                        <Input type="number" step="0.01" value={item.unitPrice} onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)} />
                      </div>
                      <div className="col-span-1 flex items-end">
                        <Button type="button" variant="destructive" size="sm" onClick={() => handleRemoveItem(index)}>×</Button>
                      </div>
                    </div>
                    {(item as any).savingsAmount > 0 && (
                      <p className="mt-2 text-xs text-green-600 font-medium">
                        📦 Economia: {formatCurrency((item as any).savingsAmount)} ({((item as any).savingsPercent || 0).toFixed(0)}%)
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Desconto na edição */}
            {formData.items.length > 0 && (() => {
              const subtotal = formData.items.reduce((sum, item) => sum + item.totalPrice, 0);
              const discPct = parseFloat(formData.discountPercent) || 0;
              const discAmt = parseFloat(formData.discountAmount) || 0;
              const finalDiscAmt = discPct > 0 ? (subtotal * discPct / 100) : discAmt;
              return (
                <div className="grid grid-cols-3 gap-4 items-end">
                  <div>
                    <Label>Desconto (%)</Label>
                    <Input type="number" step="0.1" placeholder="0" value={formData.discountPercent} onChange={(e) => setFormData(prev => ({ ...prev, discountPercent: e.target.value, discountAmount: '' }))} />
                  </div>
                  <div>
                    <Label>Desconto (R$)</Label>
                    <Input type="number" step="0.01" placeholder="0,00" value={formData.discountAmount} onChange={(e) => setFormData(prev => ({ ...prev, discountAmount: e.target.value, discountPercent: '' }))} />
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total Final</p>
                    <p className="text-xl font-bold text-purple-600">{formatCurrency(subtotal - finalDiscAmt)}</p>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => { setIsEditModalOpen(false); setEditingQuote(null); }}>Cancelar</Button>
            <Button onClick={handleSaveEditQuote} className="bg-purple-600 hover:bg-purple-700">Salvar Alterações</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Partial Conversion Modal */}
      <Dialog open={isPartialModalOpen} onOpenChange={setIsPartialModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Fechamento Parcial</DialogTitle>
            <DialogDescription>Selecione os itens que deseja converter em venda agora</DialogDescription>
          </DialogHeader>
          
          {selectedQuote && (
            <div className="space-y-4">
              <div className="space-y-2">
                {selectedQuote.items.map(item => {
                  const isSelected = partialSelectedItems.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${isSelected ? 'border-green-500 bg-green-50' : 'hover:border-gray-400'}`}
                      onClick={() => {
                        setPartialSelectedItems(prev =>
                          isSelected ? prev.filter(id => id !== item.id) : [...prev, item.id]
                        );
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${isSelected ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}>
                            {isSelected && <CheckCircle className="h-3 w-3 text-white" />}
                          </div>
                          <span className="font-medium">{item.description}</span>
                        </div>
                        <span className="font-semibold">{formatCurrency(item.totalPrice)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground ml-6">{item.quantity}x {formatCurrency(item.unitPrice)}</p>
                    </div>
                  );
                })}
              </div>

              {partialSelectedItems.length > 0 && (() => {
                const selectedTotal = selectedQuote.items.filter(i => partialSelectedItems.includes(i.id)).reduce((sum, i) => sum + i.totalPrice, 0);
                return (
                  <>
                    <div className="p-3 bg-purple-50 rounded-lg flex justify-between items-center">
                      <span className="font-semibold">Total Selecionado:</span>
                      <span className="text-lg font-bold text-purple-600">{formatCurrency(selectedTotal)}</span>
                    </div>

                    <div>
                      <Label>Formas de Pagamento</Label>
                      {paymentSplits.map((split, index) => (
                        <div key={index} className="grid grid-cols-3 gap-3 mb-3">
                          <Select value={split.paymentMethod} onValueChange={(value) => {
                            const newSplits = [...paymentSplits];
                            newSplits[index].paymentMethod = value;
                            setPaymentSplits(newSplits);
                          }}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CASH_PIX">Dinheiro/Pix</SelectItem>
                              <SelectItem value="CREDIT_CARD">Cartão Crédito</SelectItem>
                              <SelectItem value="DEBIT_CARD">Cartão Débito</SelectItem>
                              <SelectItem value="BANK_SLIP">Boleto</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input type="number" step="0.01" placeholder="Valor" value={split.amount} onChange={(e) => {
                            const newSplits = [...paymentSplits];
                            newSplits[index].amount = parseFloat(e.target.value) || 0;
                            setPaymentSplits(newSplits);
                          }} />
                          {split.paymentMethod === 'CREDIT_CARD' && (
                            <Input type="number" min="1" placeholder="Parcelas" value={split.installments} onChange={(e) => {
                              const newSplits = [...paymentSplits];
                              newSplits[index].installments = parseInt(e.target.value) || 1;
                              setPaymentSplits(newSplits);
                            }} />
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsPartialModalOpen(false)}>Cancelar</Button>
                <Button onClick={handlePartialConvert} className="bg-green-600 hover:bg-green-700">Confirmar Fechamento Parcial</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Convert to Sale Modal */}
      <Dialog open={isConvertModalOpen} onOpenChange={setIsConvertModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Converter Orçamento em Venda</DialogTitle>
            <DialogDescription>
              Configure pagamento, desconto e taxas
            </DialogDescription>
          </DialogHeader>
          
          {selectedQuote && (() => {
            const convDiscAmt = parseFloat((formData as any).convertDiscountAmount || '0') || 0;
            const convDiscPct = parseFloat((formData as any).convertDiscountPercent || '0') || 0;
            const effectiveDisc = convDiscPct > 0 ? (selectedQuote.finalAmount * convDiscPct / 100) : convDiscAmt;
            const afterDiscount = selectedQuote.finalAmount - effectiveDisc;
            const convCardFee = parseFloat((formData as any).convertCardFee || '0') || 0;
            const convTaxRate = parseFloat((formData as any).convertTaxRate || '0') || 0;
            const netAmount = afterDiscount - (convCardFee > 0 ? afterDiscount * convCardFee / 100 : 0) - (convTaxRate > 0 ? afterDiscount * convTaxRate / 100 : 0);

            return (
            <div className="space-y-4">
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="flex justify-between">
                  <div>
                    <p className="text-sm font-semibold">Valor do Orçamento:</p>
                    <p className="text-xl font-bold text-purple-600">{formatCurrency(selectedQuote.finalAmount)}</p>
                  </div>
                  {effectiveDisc > 0 && (
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Após desconto:</p>
                      <p className="text-xl font-bold text-green-600">{formatCurrency(afterDiscount)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Desconto na conversão */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Desconto Adicional (%)</Label>
                  <Input
                    type="number" step="0.1" min="0" placeholder="0"
                    value={(formData as any).convertDiscountPercent || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, convertDiscountPercent: e.target.value, convertDiscountAmount: '' } as any))}
                  />
                </div>
                <div>
                  <Label>Desconto Adicional (R$)</Label>
                  <Input
                    type="number" step="0.01" min="0" placeholder="0,00"
                    value={(formData as any).convertDiscountAmount || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, convertDiscountAmount: e.target.value, convertDiscountPercent: '' } as any))}
                  />
                </div>
              </div>

              {/* Taxas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Taxa do Cartão (%)</Label>
                  <Input
                    type="number" step="0.1" min="0" placeholder="Ex: 3.5"
                    value={(formData as any).convertCardFee || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, convertCardFee: e.target.value } as any))}
                  />
                </div>
                <div>
                  <Label>Alíquota de Imposto (%)</Label>
                  <Input
                    type="number" step="0.1" min="0" placeholder="Ex: 6.0"
                    value={(formData as any).convertTaxRate || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, convertTaxRate: e.target.value } as any))}
                  />
                </div>
              </div>

              {/* Resumo financeiro */}
              {(effectiveDisc > 0 || convCardFee > 0 || convTaxRate > 0) && (
                <div className="p-3 border rounded-lg space-y-1 text-sm">
                  <div className="flex justify-between"><span>Subtotal:</span><span>{formatCurrency(selectedQuote.finalAmount)}</span></div>
                  {effectiveDisc > 0 && <div className="flex justify-between text-red-600"><span>Desconto:</span><span>-{formatCurrency(effectiveDisc)}</span></div>}
                  {convCardFee > 0 && <div className="flex justify-between text-orange-600"><span>Taxa Cartão:</span><span>-{formatCurrency(afterDiscount * convCardFee / 100)}</span></div>}
                  {convTaxRate > 0 && <div className="flex justify-between text-orange-600"><span>Imposto:</span><span>-{formatCurrency(afterDiscount * convTaxRate / 100)}</span></div>}
                  <div className="flex justify-between font-bold text-green-600 pt-1 border-t"><span>Valor Líquido:</span><span>{formatCurrency(netAmount)}</span></div>
                </div>
              )}

              <div>
                <Label>Formas de Pagamento</Label>
                {paymentSplits.map((split, index) => (
                  <div key={index} className="grid grid-cols-3 gap-3 mb-3">
                    <Select
                      value={split.paymentMethod}
                      onValueChange={(value) => {
                        const newSplits = [...paymentSplits];
                        newSplits[index].paymentMethod = value;
                        setPaymentSplits(newSplits);
                      }}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH_PIX">Dinheiro/Pix</SelectItem>
                        <SelectItem value="CREDIT_CARD">Cartão de Crédito</SelectItem>
                        <SelectItem value="DEBIT_CARD">Cartão de Débito</SelectItem>
                        <SelectItem value="BANK_SLIP">Boleto</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number" step="0.01" placeholder="Valor"
                      value={split.amount}
                      onChange={(e) => {
                        const newSplits = [...paymentSplits];
                        newSplits[index].amount = parseFloat(e.target.value) || 0;
                        setPaymentSplits(newSplits);
                      }}
                    />
                    {split.paymentMethod === 'CREDIT_CARD' && (
                      <Input
                        type="number" min="1" placeholder="Parcelas"
                        value={split.installments}
                        onChange={(e) => {
                          const newSplits = [...paymentSplits];
                          newSplits[index].installments = parseInt(e.target.value) || 1;
                          setPaymentSplits(newSplits);
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsConvertModalOpen(false)}>Cancelar</Button>
                <Button onClick={handleConvertToSale} className="bg-green-600 hover:bg-green-700">Confirmar Conversão</Button>
              </div>
            </div>
            );
          })()}
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}