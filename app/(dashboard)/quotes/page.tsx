'use client';

import { useState, useEffect } from 'react';
import { Plus, TrendingUp, DollarSign, CheckCircle, XCircle, Clock, FileText, Search, Filter, Download, Settings } from 'lucide-react';
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
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  procedure?: Procedure;
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
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);

  // Form state for creating quote
  const [formData, setFormData] = useState({
    patientId: '',
    collaboratorId: '',
    title: '',
    leadSource: '',
    notes: '',
    expirationDate: '',
    items: [] as QuoteItem[]
  });

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

    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
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
          saleDate: new Date().toISOString()
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
                  <Button type="button" size="sm" onClick={handleAddItem}>
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar Item
                  </Button>
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

                {formData.items.length > 0 && (
                  <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>Total do Orçamento:</span>
                      <span className="text-purple-600">
                        {formatCurrency(formData.items.reduce((sum, item) => sum + item.totalPrice, 0))}
                      </span>
                    </div>
                  </div>
                )}
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
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Convert to Sale Modal */}
      <Dialog open={isConvertModalOpen} onOpenChange={setIsConvertModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Converter Orçamento em Venda</DialogTitle>
            <DialogDescription>
              Configure as formas de pagamento para converter este orçamento em uma venda confirmada.
            </DialogDescription>
          </DialogHeader>
          
          {selectedQuote && (
            <div className="space-y-4">
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <p className="text-sm font-semibold">Valor Total:</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(selectedQuote.finalAmount)}
                </p>
              </div>

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
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH_PIX">Dinheiro/Pix</SelectItem>
                        <SelectItem value="CREDIT_CARD">Cartão de Crédito</SelectItem>
                        <SelectItem value="DEBIT_CARD">Cartão de Débito</SelectItem>
                        <SelectItem value="BANK_SLIP">Boleto</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Valor"
                      value={split.amount}
                      onChange={(e) => {
                        const newSplits = [...paymentSplits];
                        newSplits[index].amount = parseFloat(e.target.value) || 0;
                        setPaymentSplits(newSplits);
                      }}
                    />
                    {split.paymentMethod === 'CREDIT_CARD' && (
                      <Input
                        type="number"
                        min="1"
                        placeholder="Parcelas"
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
                <Button variant="outline" onClick={() => setIsConvertModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleConvertToSale} className="bg-green-600 hover:bg-green-700">
                  Confirmar Conversão
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}