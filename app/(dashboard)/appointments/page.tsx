'use client';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils';

import { useEffect, useState, useRef } from 'react';
import { Plus, TrendingUp, ShoppingCart, Clock, CheckCircle2, X, User, Phone, Mail, Calendar, CreditCard, Edit, XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

interface Patient {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
}

interface Procedure {
  id: string;
  name: string;
  price: number;
}

interface Package {
  id: string;
  name: string;
  finalPrice: number;
  items: Array<{
    procedureId: string;
    quantity: number;
    procedure: Procedure;
  }>;
}

interface SaleItem {
  id: string;
  procedureId: string;
  quantity: number;
  unitPrice: number;
  procedure: Procedure;
}

interface Session {
  id: string;
  procedureId: string;
  status: string;
  scheduledDate?: string | null;
  completedDate?: string | null;
  notes?: string | null;
  procedure: Procedure;
}

interface PaymentInstallment {
  id?: string;
  installmentNumber: number;
  amount: number;
  dueDate: string;
  status?: string;
  notes?: string;
}

interface PaymentSplit {
  id?: string;
  paymentMethod: string;
  amount: number;
  installments: number;
  installmentDetails: PaymentInstallment[];
  cardOperator?: string;
  cardType?: 'DEBIT' | 'CREDIT';
}

interface Sale {
  id: string;
  patient: Patient;
  saleDate: string;
  totalAmount: number;
  paymentMethod?: string | null;
  installments?: number;
  paymentStatus: string;
  notes?: string | null;
  items: SaleItem[];
  sessions: Session[];
  paymentSplits?: PaymentSplit[];
  _count: {
    sessions: number;
  };
  completedSessions: number;
}

interface Stats {
  totalRevenue: number;
  completedSales: number;
  pendingSessions: number;
  completedSessions: number;
}

export default function AppointmentsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [selectedPatient, setSelectedPatient] = useState('');
  const [selectedProcedure, setSelectedProcedure] = useState('');
  const [selectedPackage, setSelectedPackage] = useState('');
  const [saleType, setSaleType] = useState<'individual' | 'package'>('individual');
  const [quantity, setQuantity] = useState('1');
  const [saleDate, setSaleDate] = useState('');
  const [sessionDates, setSessionDates] = useState<string[]>([]);
  
  // Payment splits state
  const [paymentSplits, setPaymentSplits] = useState<PaymentSplit[]>([]);
  const [currentSplitMethod, setCurrentSplitMethod] = useState('CASH_PIX');
  const [currentSplitAmount, setCurrentSplitAmount] = useState('');
  const [currentSplitInstallments, setCurrentSplitInstallments] = useState(1);
  const [currentCardOperator, setCurrentCardOperator] = useState('');
  const [currentCardType, setCurrentCardType] = useState<'DEBIT' | 'CREDIT'>('CREDIT');
  const [cardFeeRules, setCardFeeRules] = useState<any[]>([]);
  const [calculatedNetAmount, setCalculatedNetAmount] = useState<number | null>(null);

  // Procedure dropdown state
  const [isProcedureDropdownOpen, setIsProcedureDropdownOpen] = useState(false);
  const [procedureSearch, setProcedureSearch] = useState('');
  const [showNewProcedureForm, setShowNewProcedureForm] = useState(false);
  const [newProcedure, setNewProcedure] = useState({ name: '', price: '', duration: '' });
  const procedureDropdownRef = useRef<HTMLDivElement>(null);

  // Patient dropdown state
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: '', phone: '', email: '' });
  const patientDropdownRef = useRef<HTMLDivElement>(null);

  // Edit sale state
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editSessionDates, setEditSessionDates] = useState<{[key: string]: string}>({});
  const [sessionsToCancel, setSessionsToCancel] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Set initial date on client side to avoid hydration mismatch
    setSaleDate(new Date().toISOString().split('T')[0]);
    loadData();
  }, []);

  // Click outside handler for procedure dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (procedureDropdownRef.current && !procedureDropdownRef.current.contains(event.target as Node)) {
        setIsProcedureDropdownOpen(false);
        setShowNewProcedureForm(false);
        setProcedureSearch('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Click outside handler for patient dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (patientDropdownRef.current && !patientDropdownRef.current.contains(event.target as Node)) {
        setIsPatientDropdownOpen(false);
        setShowNewPatientForm(false);
        setPatientSearch('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update session dates when quantity changes
  useEffect(() => {
    const numSessions = parseInt(quantity) || 1;
    const today = new Date().toISOString().split('T')[0];
    
    // Initialize with empty dates or keep existing ones
    setSessionDates(prev => {
      const newDates = Array(numSessions).fill('');
      // Keep existing dates if they exist
      for (let i = 0; i < Math.min(prev.length, numSessions); i++) {
        newDates[i] = prev[i];
      }
      return newDates;
    });
  }, [quantity]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, salesRes, patientsRes, proceduresRes, cardFeesRes, packagesRes] = await Promise.all([
        fetch('/api/sales/stats'),
        fetch('/api/sales'),
        fetch('/api/patients'),
        fetch('/api/procedures'),
        fetch('/api/costs/card-fees'),
        fetch('/api/packages'),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (salesRes.ok) setSales(await salesRes.json());
      if (patientsRes.ok) setPatients(await patientsRes.json());
      if (proceduresRes.ok) setProcedures(await proceduresRes.json());
      if (cardFeesRes.ok) {
        const cardFeesData = await cardFeesRes.json();
        setCardFeeRules(cardFeesData.rules || []);
      }
      if (packagesRes.ok) setPackages(await packagesRes.json());
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProcedure = (procedureId: string) => {
    setSelectedProcedure(procedureId);
    setIsProcedureDropdownOpen(false);
    setProcedureSearch('');
  };

  const handleCreateNewProcedure = async () => {
    if (!newProcedure.name || !newProcedure.price) {
      toast.error('Preencha o nome e o preço do procedimento');
      return;
    }

    try {
      const res = await fetch('/api/procedures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProcedure.name,
          price: parseFloat(newProcedure.price),
          duration: parseInt(newProcedure.duration) || 0,
          supplies: [],
          collaborators: [],
        }),
      });

      if (res.ok) {
        const created = await res.json();
        toast.success('Procedimento cadastrado!');
        setNewProcedure({ name: '', price: '', duration: '' });
        setShowNewProcedureForm(false);
        setProcedureSearch('');
        await loadData();
        setSelectedProcedure(created.id);
        setIsProcedureDropdownOpen(false);
      } else {
        const error = await res.json();
        toast.error(error.error || 'Erro ao cadastrar procedimento');
      }
    } catch (error) {
      console.error('Error creating procedure:', error);
      toast.error('Erro ao cadastrar procedimento');
    }
  };

  const handleSelectPatient = (patientId: string) => {
    setSelectedPatient(patientId);
    setIsPatientDropdownOpen(false);
    setPatientSearch('');
  };

  const handleCreateNewPatient = async () => {
    if (!newPatient.name || !newPatient.phone) {
      toast.error('Preencha o nome e o telefone do paciente');
      return;
    }

    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPatient.name,
          phone: newPatient.phone,
          email: newPatient.email || null,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        toast.success('Paciente cadastrado!');
        setNewPatient({ name: '', phone: '', email: '' });
        setShowNewPatientForm(false);
        setPatientSearch('');
        await loadData();
        setSelectedPatient(created.id);
        setIsPatientDropdownOpen(false);
      } else {
        const error = await res.json();
        toast.error(error.error || 'Erro ao cadastrar paciente');
      }
    } catch (error) {
      console.error('Error creating patient:', error);
      toast.error('Erro ao cadastrar paciente');
    }
  };

  const handleUpdateSessionDate = (index: number, date: string) => {
    setSessionDates(prev => {
      const newDates = [...prev];
      newDates[index] = date;
      return newDates;
    });
  };

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPatient || !selectedProcedure) {
      toast.error('Selecione um paciente e procedimento');
      return;
    }

    if (paymentSplits.length === 0) {
      toast.error('Adicione pelo menos uma forma de pagamento');
      return;
    }

    const procedure = procedures.find(p => p.id === selectedProcedure);
    if (!procedure) return;

    const totalAmount = procedure.price * parseInt(quantity);
    
    // Validate splits sum equals total
    const splitsTotal = paymentSplits.reduce((sum, split) => sum + split.amount, 0);
    if (Math.abs(splitsTotal - totalAmount) > 0.01) {
      toast.error(`A soma dos pagamentos (${formatCurrency(splitsTotal)}) deve ser igual ao total da venda (${formatCurrency(totalAmount)})`);
      return;
    }

    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatient,
          saleDate,
          totalAmount,
          items: [
            {
              procedureId: selectedProcedure,
              quantity: parseInt(quantity),
              unitPrice: procedure.price,
            },
          ],
          paymentSplits: paymentSplits,
          sessionDates: sessionDates, // Send session dates to API
        }),
      });

      if (res.ok) {
        toast.success('Venda cadastrada com sucesso!');
        setSelectedPatient('');
        setSelectedProcedure('');
        setQuantity('1');
        setSessionDates([]);
        setPaymentSplits([]);
        setCurrentSplitAmount('');
        setCurrentSplitMethod('CASH_PIX');
        setCurrentSplitInstallments(1);
        setSaleDate(new Date().toISOString().split('T')[0]);
        loadData();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Erro ao cadastrar venda');
      }
    } catch (error) {
      console.error('Error creating sale:', error);
      toast.error('Erro ao cadastrar venda');
    }
  };

  // Helper functions for payment splits
  // Calculate card fee based on installments, operator and type
  const calculateCardFee = (installments: number, operator: string, cardType: string): number => {
    if (!operator) return 0;
    
    // Find matching card fee rule by exact installment count
    const rule = cardFeeRules.find(r => 
      r.cardOperator === operator &&
      r.cardType === cardType &&
      r.installmentCount === installments &&
      r.isActive
    );
    
    return rule ? rule.feePercentage : 0;
  };

  // Get receiving days for selected card operator
  const getReceivingDays = (operator: string, cardType: string, installments: number): number => {
    if (!operator) return 30; // default
    
    // Find matching card fee rule by exact installment count
    const rule = cardFeeRules.find(r => 
      r.cardOperator === operator &&
      r.cardType === cardType &&
      r.installmentCount === installments &&
      r.isActive
    );
    
    return rule ? rule.receivingDays : 30;
  };

  // Calculate net amount after card fees
  const calculateNetAmount = (grossAmount: number, installments: number, paymentMethod: string, operator: string, cardType: string): number => {
    if ((paymentMethod === 'CREDIT_CARD' || paymentMethod === 'DEBIT_CARD') && operator) {
      const feePercentage = calculateCardFee(installments, operator, cardType);
      const feeAmount = (grossAmount * feePercentage) / 100;
      return grossAmount - feeAmount;
    }
    return grossAmount;
  };

  // Update calculated net amount when split amount, installments, or method changes
  useEffect(() => {
    const amount = parseFloat(currentSplitAmount);
    if (amount > 0 && (currentSplitMethod === 'CREDIT_CARD' || currentSplitMethod === 'DEBIT_CARD')) {
      const netAmount = calculateNetAmount(amount, currentSplitInstallments, currentSplitMethod, currentCardOperator, currentCardType);
      setCalculatedNetAmount(netAmount);
    } else {
      setCalculatedNetAmount(null);
    }
  }, [currentSplitAmount, currentSplitInstallments, currentSplitMethod, currentCardOperator, currentCardType, cardFeeRules]);

  const handleAddPaymentSplit = () => {
    const amount = parseFloat(currentSplitAmount);
    
    if (!amount || amount <= 0) {
      toast.error('Informe um valor válido para o pagamento');
      return;
    }

    // Validate card operator for card payments
    if ((currentSplitMethod === 'CREDIT_CARD' || currentSplitMethod === 'DEBIT_CARD') && !currentCardOperator) {
      toast.error('Selecione a operadora de cartão');
      return;
    }

    const procedure = procedures.find(p => p.id === selectedProcedure);
    if (!procedure) {
      toast.error('Selecione um procedimento primeiro');
      return;
    }

    const totalAmount = procedure.price * parseInt(quantity);
    const currentTotal = paymentSplits.reduce((sum, split) => sum + split.amount, 0);
    
    if (currentTotal + amount > totalAmount) {
      toast.error('O valor total dos pagamentos não pode exceder o valor da venda');
      return;
    }

    // Calculate net amount and fee
    const netAmount = calculateNetAmount(amount, currentSplitInstallments, currentSplitMethod, currentCardOperator, currentCardType);
    const feePercentage = (currentSplitMethod === 'CREDIT_CARD' || currentSplitMethod === 'DEBIT_CARD') 
      ? calculateCardFee(currentSplitInstallments, currentCardOperator, currentCardType) 
      : 0;
    const feeAmount = amount - netAmount;

    // Generate installment details with receiving days consideration
    const installmentDetails: PaymentInstallment[] = [];
    const installmentAmount = amount / currentSplitInstallments;
    
    // Get receiving days from card fee rules
    const receivingDays = (currentSplitMethod === 'CREDIT_CARD' || currentSplitMethod === 'DEBIT_CARD') 
      ? getReceivingDays(currentCardOperator, currentCardType, currentSplitInstallments)
      : 0;
    
    for (let i = 0; i < currentSplitInstallments; i++) {
      const dueDate = new Date();
      
      // For first installment, add receiving days
      if (i === 0) {
        dueDate.setDate(dueDate.getDate() + receivingDays);
      } else {
        // For subsequent installments, add receivingDays + (30 * i) days
        dueDate.setDate(dueDate.getDate() + receivingDays + (30 * i));
      }
      
      installmentDetails.push({
        installmentNumber: i + 1,
        amount: installmentAmount,
        dueDate: dueDate.toISOString().split('T')[0],
        status: 'PENDING',
      });
    }

    const newSplit: PaymentSplit = {
      paymentMethod: currentSplitMethod,
      amount,
      installments: currentSplitInstallments,
      installmentDetails,
      cardOperator: currentCardOperator || undefined,
      cardType: currentCardType,
    };

    setPaymentSplits([...paymentSplits, newSplit]);
    setCurrentSplitAmount('');
    setCurrentSplitInstallments(1);
    setCurrentCardOperator('');
    setCurrentCardType('CREDIT');
    
    if (currentSplitMethod === 'CREDIT_CARD' && feePercentage > 0) {
      toast.success(
        `Pagamento adicionado! Taxa de ${formatNumber(feePercentage, 2)}% aplicada. Valor líquido: ${formatCurrency(netAmount)}`,
        { duration: 5000 }
      );
    } else {
      toast.success('Forma de pagamento adicionada');
    }
  };

  const handleRemovePaymentSplit = (index: number) => {
    const newSplits = paymentSplits.filter((_, i) => i !== index);
    setPaymentSplits(newSplits);
    toast.success('Forma de pagamento removida');
  };

  const handleUpdateInstallmentDate = (splitIndex: number, installmentIndex: number, newDate: string) => {
    const newSplits = [...paymentSplits];
    newSplits[splitIndex].installmentDetails[installmentIndex].dueDate = newDate;
    setPaymentSplits(newSplits);
  };

  const formatPaymentMethod = (method: string) => {
    const labels: Record<string, string> = {
      CASH_PIX: 'Dinheiro / Pix',
      CREDIT_CARD: 'Cartão Crédito',
      DEBIT_CARD: 'Cartão Débito',
      BANK_SLIP: 'Boleto',
    };
    return labels[method] || method;
  };

  const handleCompleteSession = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/complete`, {
        method: 'PATCH',
      });

      if (res.ok) {
        toast.success('Sessão concluída!');
        loadData();
        // Reload sale details if modal is open
        if (selectedSale) {
          const saleRes = await fetch(`/api/sales/${selectedSale.id}`);
          if (saleRes.ok) {
            setSelectedSale(await saleRes.json());
          }
        }
      } else {
        toast.error('Erro ao concluir sessão');
      }
    } catch (error) {
      console.error('Error completing session:', error);
      toast.error('Erro ao concluir sessão');
    }
  };

  const openSaleDetails = async (sale: Sale) => {
    try {
      // Fetch full sale details with sessions
      const res = await fetch(`/api/sales/${sale.id}`);
      if (res.ok) {
        const fullSale = await res.json();
        setSelectedSale(fullSale);
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error('Error fetching sale details:', error);
      toast.error('Erro ao carregar detalhes');
    }
  };

  const openEditSale = async (sale: Sale, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // Fetch full sale details with sessions
      const res = await fetch(`/api/sales/${sale.id}`);
      if (res.ok) {
        const fullSale = await res.json();
        setEditingSale(fullSale);
        
        // Initialize edit session dates
        const dates: {[key: string]: string} = {};
        fullSale.sessions?.forEach((session: Session) => {
          if (session.scheduledDate) {
            dates[session.id] = session.scheduledDate.split('T')[0];
          }
        });
        setEditSessionDates(dates);
        setIsEditModalOpen(true);
      }
    } catch (error) {
      console.error('Error fetching sale details:', error);
      toast.error('Erro ao carregar detalhes');
    }
  };

  const handleUpdateEditSessionDate = (sessionId: string, date: string) => {
    setEditSessionDates(prev => ({
      ...prev,
      [sessionId]: date,
    }));
  };

  const toggleSessionForCancellation = (sessionId: string) => {
    setSessionsToCancel(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };

  const handleCancelSelectedSessions = async () => {
    if (sessionsToCancel.size === 0) {
      toast.error('Selecione pelo menos uma sessão para cancelar');
      return;
    }

    if (!confirm(`Tem certeza que deseja cancelar ${sessionsToCancel.size} sessão(ões)?`)) {
      return;
    }

    try {
      const cancelPromises = Array.from(sessionsToCancel).map(sessionId => {
        return fetch(`/api/sessions/${sessionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'CANCELLED' }),
        });
      });

      const results = await Promise.all(cancelPromises);
      const allSuccess = results.every(res => res.ok);

      if (allSuccess) {
        toast.success(`${sessionsToCancel.size} sessão(ões) cancelada(s) com sucesso!`);
        setSessionsToCancel(new Set());
        loadData();
        
        // Refresh the editing sale data
        if (editingSale) {
          const saleRes = await fetch(`/api/sales/${editingSale.id}`);
          if (saleRes.ok) {
            const updatedSale = await saleRes.json();
            setEditingSale(updatedSale);
          }
        }
      } else {
        toast.error('Erro ao cancelar algumas sessões');
      }
    } catch (error) {
      console.error('Error cancelling sessions:', error);
      toast.error('Erro ao cancelar sessões');
    }
  };

  const handleSaveEditedSale = async () => {
    if (!editingSale) return;

    try {
      // Update session dates
      const updatePromises = Object.entries(editSessionDates).map(([sessionId, date]) => {
        return fetch(`/api/sessions/${sessionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scheduledDate: date }),
        });
      });

      const results = await Promise.all(updatePromises);
      const allSuccess = results.every(res => res.ok);

      if (allSuccess) {
        toast.success('Alterações salvas com sucesso!');
        setIsEditModalOpen(false);
        setEditingSale(null);
        setEditSessionDates({});
        setSessionsToCancel(new Set());
        loadData();
      } else {
        toast.error('Erro ao salvar algumas alterações');
      }
    } catch (error) {
      console.error('Error saving edited sale:', error);
      toast.error('Erro ao salvar alterações');
    }
  };

  const filteredSales = sales.filter(sale =>
    sale.patient.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const paymentMethodLabels: Record<string, string> = {
    CASH_PIX: 'Dinheiro/Pix',
    CREDIT_CARD: 'Cartão Crédito',
    DEBIT_CARD: 'Cartão Débito',
    BANK_SLIP: 'Boleto',
  };

  const paymentStatusLabels: Record<string, { label: string; color: string }> = {
    PENDING: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
    PARTIAL: { label: 'Parcial', color: 'bg-orange-100 text-orange-800' },
    PAID: { label: 'Pago', color: 'bg-green-100 text-green-800' },
    OVERDUE: { label: 'Atrasado', color: 'bg-red-100 text-red-800' },
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Atendimentos Negociados</h1>
        <p className="text-gray-600 dark:text-gray-400">Gerencie vendas, pacotes e a execução das sessões.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Vendido</CardTitle>
            <TrendingUp className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.totalRevenue || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Vendas Realizadas</CardTitle>
            <ShoppingCart className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.completedSales || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Sessões Pendentes</CardTitle>
            <Clock className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats?.pendingSessions || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Sessões Realizadas</CardTitle>
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats?.completedSessions || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - New Sale Form */}
        <Card>
          <CardHeader>
            <CardTitle>Nova Venda / Agendamento</CardTitle>
            <CardDescription>Registre uma nova venda e crie as sessões automaticamente</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateSale} className="space-y-4">
              <div>
                <Label htmlFor="saleDate">Data da Venda</Label>
                <Input
                  id="saleDate"
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="patient">Paciente</Label>
                <div className="relative" ref={patientDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsPatientDropdownOpen(!isPatientDropdownOpen)}
                    className="w-full px-4 py-2 text-left border border-gray-300 dark:border-gray-600 rounded-md hover:border-purple-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                  >
                    {selectedPatient ? (
                      <span className="text-gray-900 dark:text-gray-100">
                        {patients.find(p => p.id === selectedPatient)?.name || 'Selecione...'}
                      </span>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400">Selecione um paciente...</span>
                    )}
                  </button>

                  {isPatientDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg overflow-hidden flex flex-col" style={{ maxHeight: '400px' }}>
                      {/* Search Box */}
                      <div className="p-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0">
                        <Input
                          type="text"
                          placeholder="Buscar paciente..."
                          value={patientSearch}
                          onChange={(e) => setPatientSearch(e.target.value)}
                          className="w-full"
                          autoFocus
                        />
                      </div>

                      {/* Patients List or New Patient Form */}
                      {showNewPatientForm ? (
                        <div className="p-3 space-y-3 overflow-y-auto flex-1">
                          <div>
                            <Label className="text-xs">Nome do Paciente *</Label>
                            <Input
                              type="text"
                              value={newPatient.name}
                              onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                              placeholder="Ex: João Silva"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Telefone/WhatsApp *</Label>
                            <Input
                              type="text"
                              value={newPatient.phone}
                              onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                              placeholder="(11) 99999-9999"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Email (opcional)</Label>
                            <Input
                              type="email"
                              value={newPatient.email}
                              onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                              placeholder="exemplo@email.com"
                              className="mt-1"
                            />
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Button
                              type="button"
                              onClick={handleCreateNewPatient}
                              size="sm"
                              className="flex-1 bg-purple-600 hover:bg-purple-700"
                            >
                              Salvar
                            </Button>
                            <Button
                              type="button"
                              onClick={() => {
                                setShowNewPatientForm(false);
                                setNewPatient({ name: '', phone: '', email: '' });
                              }}
                              size="sm"
                              variant="outline"
                              className="flex-1"
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Scrollable patient list */}
                          <div className="overflow-y-auto flex-1">
                            {patients
                              .filter((patient) =>
                                patient.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
                                patient.phone.includes(patientSearch)
                              )
                              .map((patient) => (
                                <button
                                  key={patient.id}
                                  type="button"
                                  onClick={() => handleSelectPatient(patient.id)}
                                  className="w-full px-4 py-2 text-left hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                                >
                                  <div className="flex flex-col">
                                    <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                                      {patient.name}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {patient.phone}
                                    </span>
                                  </div>
                                </button>
                              ))}
                          </div>
                          {/* Fixed button at the bottom */}
                          <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => setShowNewPatientForm(true)}
                              className="w-full px-4 py-3 text-sm font-medium text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors flex items-center justify-center gap-2"
                            >
                              <Plus className="h-4 w-4" />
                              Cadastrar Novo Paciente
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="procedure">Adicionar Procedimentos</Label>
                <div className="relative" ref={procedureDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsProcedureDropdownOpen(!isProcedureDropdownOpen)}
                    className="w-full px-4 py-2 text-left border border-gray-300 dark:border-gray-600 rounded-md hover:border-purple-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                  >
                    {selectedProcedure ? (
                      <span className="text-gray-900 dark:text-gray-100">
                        {procedures.find(p => p.id === selectedProcedure)?.name || 'Selecione...'}
                      </span>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400">Selecione um procedimento...</span>
                    )}
                  </button>

                  {isProcedureDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
                      {/* Search Box */}
                      <div className="p-2 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900">
                        <Input
                          type="text"
                          placeholder="Buscar procedimento..."
                          value={procedureSearch}
                          onChange={(e) => setProcedureSearch(e.target.value)}
                          className="w-full"
                          autoFocus
                        />
                      </div>

                      {/* Procedures List */}
                      {showNewProcedureForm ? (
                        <div className="p-3 space-y-3 border-b border-gray-200 dark:border-gray-700">
                          <div>
                            <Label className="text-xs">Nome do Procedimento *</Label>
                            <Input
                              type="text"
                              value={newProcedure.name}
                              onChange={(e) => setNewProcedure({ ...newProcedure, name: e.target.value })}
                              placeholder="Ex: Botox, Limpeza de Pele..."
                              className="mt-1"
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">Preço (R$) *</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={newProcedure.price}
                                onChange={(e) => setNewProcedure({ ...newProcedure, price: e.target.value })}
                                placeholder="0,00"
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Duração (min)</Label>
                              <Input
                                type="number"
                                value={newProcedure.duration}
                                onChange={(e) => setNewProcedure({ ...newProcedure, duration: e.target.value })}
                                placeholder="60"
                                className="mt-1"
                              />
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Button
                              type="button"
                              onClick={handleCreateNewProcedure}
                              size="sm"
                              className="flex-1 bg-purple-600 hover:bg-purple-700"
                            >
                              Salvar
                            </Button>
                            <Button
                              type="button"
                              onClick={() => {
                                setShowNewProcedureForm(false);
                                setNewProcedure({ name: '', price: '', duration: '' });
                              }}
                              size="sm"
                              variant="outline"
                              className="flex-1"
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="max-h-48 overflow-auto">
                            {procedures
                              .filter((proc) =>
                                proc.name.toLowerCase().includes(procedureSearch.toLowerCase())
                              )
                              .map((proc) => (
                                <button
                                  key={proc.id}
                                  type="button"
                                  onClick={() => handleSelectProcedure(proc.id)}
                                  className="w-full px-4 py-2 text-left hover:bg-purple-50 transition-colors flex items-center justify-between"
                                >
                                  <span className="text-sm text-gray-700 dark:text-gray-300">{proc.name}</span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatCurrency(proc.price)}
                                  </span>
                                </button>
                              ))}
                          </div>
                          <div className="border-t border-gray-200 dark:border-gray-700">
                            <button
                              type="button"
                              onClick={() => setShowNewProcedureForm(true)}
                              className="w-full px-4 py-2 text-sm text-purple-600 hover:bg-purple-50 transition-colors flex items-center gap-2"
                            >
                              <Plus className="h-4 w-4" />
                              Cadastrar Novo Procedimento
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="quantity">Quantidade de Sessões</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </div>

              {/* Session Dates Section */}
              {selectedProcedure && parseInt(quantity) > 0 && (
                <div className="space-y-3 border-t pt-4">
                  <div>
                    <Label className="text-base font-semibold text-purple-700">
                      Datas das Sessões
                    </Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {procedures.find(p => p.id === selectedProcedure)?.name || 'Procedimento selecionado'}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Array.from({ length: parseInt(quantity) || 1 }).map((_, index) => (
                      <div key={index} className="space-y-1">
                        <Label htmlFor={`session-${index}`} className="text-sm">
                          Sessão {index + 1}
                        </Label>
                        <Input
                          id={`session-${index}`}
                          type="date"
                          value={sessionDates[index] || ''}
                          onChange={(e) => handleUpdateSessionDate(index, e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label>Valor Total Cobrado</Label>
                <div className="text-2xl font-bold text-purple-600">
                  {selectedProcedure
                    ? formatCurrency((procedures.find(p => p.id === selectedProcedure)?.price || 0) * parseInt(quantity || '1'))
                    : formatCurrency(0)}
                </div>
              </div>

              {/* Payment Splits Section */}
              <div className="space-y-4 border-t pt-4">
                <div>
                  <Label className="text-lg font-semibold text-purple-700">Split de Pagamentos</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Adicione as formas de pagamento. A soma deve ser igual ao total da venda.
                  </p>
                </div>

                {/* Add Payment Split Form */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
                  <Label className="text-sm font-semibold">Adicionar Forma de Pagamento</Label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={currentSplitMethod === 'CASH_PIX' ? 'default' : 'outline'}
                      onClick={() => { setCurrentSplitMethod('CASH_PIX'); setCurrentSplitInstallments(1); }}
                      className={currentSplitMethod === 'CASH_PIX' ? 'bg-purple-600 hover:bg-purple-700' : ''}
                    >
                      Dinheiro / Pix
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={currentSplitMethod === 'CREDIT_CARD' ? 'default' : 'outline'}
                      onClick={() => setCurrentSplitMethod('CREDIT_CARD')}
                      className={currentSplitMethod === 'CREDIT_CARD' ? 'bg-purple-600 hover:bg-purple-700' : ''}
                    >
                      Cartão Crédito
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={currentSplitMethod === 'DEBIT_CARD' ? 'default' : 'outline'}
                      onClick={() => { setCurrentSplitMethod('DEBIT_CARD'); setCurrentSplitInstallments(1); }}
                      className={currentSplitMethod === 'DEBIT_CARD' ? 'bg-purple-600 hover:bg-purple-700' : ''}
                    >
                      Cartão Débito
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={currentSplitMethod === 'BANK_SLIP' ? 'default' : 'outline'}
                      onClick={() => setCurrentSplitMethod('BANK_SLIP')}
                      className={currentSplitMethod === 'BANK_SLIP' ? 'bg-purple-600 hover:bg-purple-700' : ''}
                    >
                      Boleto
                    </Button>
                  </div>

                  {/* Card Operator and Type Selection */}
                  {(currentSplitMethod === 'CREDIT_CARD' || currentSplitMethod === 'DEBIT_CARD') && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="cardOperator" className="text-xs">Operadora *</Label>
                        <Select
                          value={currentCardOperator}
                          onValueChange={(value) => setCurrentCardOperator(value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from(new Set(cardFeeRules.map(r => r.cardOperator))).map(operator => (
                              <SelectItem key={operator} value={operator}>
                                {operator}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="cardType" className="text-xs">Tipo</Label>
                        <Select
                          value={currentCardType}
                          onValueChange={(value) => setCurrentCardType(value as 'DEBIT' | 'CREDIT')}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DEBIT">Débito</SelectItem>
                            <SelectItem value="CREDIT">Crédito</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="splitAmount" className="text-xs">Valor (R$)</Label>
                      <Input
                        id="splitAmount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={currentSplitAmount}
                        onChange={(e) => setCurrentSplitAmount(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="splitInstallments" className="text-xs">Parcelas</Label>
                      <Select
                        value={currentSplitInstallments.toString()}
                        onValueChange={(value) => setCurrentSplitInstallments(parseInt(value))}
                        disabled={currentSplitMethod === 'CASH_PIX' || currentSplitMethod === 'DEBIT_CARD'}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => (
                            <SelectItem key={num} value={num.toString()}>
                              {num === 1 ? 'À vista' : `${num}x`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Card Fee Calculation Display */}
                  {calculatedNetAmount !== null && (currentSplitMethod === 'CREDIT_CARD' || currentSplitMethod === 'DEBIT_CARD') && currentCardOperator && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 dark:text-gray-300">Valor Bruto:</span>
                        <span className="font-semibold">{formatCurrency(parseFloat(currentSplitAmount))}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-red-600 dark:text-red-400">Taxa Cartão ({formatNumber(calculateCardFee(currentSplitInstallments, currentCardOperator, currentCardType), 2)}%):</span>
                        <span className="font-semibold text-red-600 dark:text-red-400">
                          -{formatCurrency(parseFloat(currentSplitAmount) - calculatedNetAmount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-xs text-gray-600 dark:text-gray-400">
                        <span>Prazo de recebimento: {getReceivingDays(currentCardOperator, currentCardType, currentSplitInstallments)} {getReceivingDays(currentCardOperator, currentCardType, currentSplitInstallments) === 1 ? 'dia' : 'dias'}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm border-t border-yellow-300 dark:border-yellow-700 pt-1">
                        <span className="text-green-700 dark:text-green-400 font-semibold">Valor Líquido:</span>
                        <span className="font-bold text-green-700 dark:text-green-400">
                          {formatCurrency(calculatedNetAmount)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                        💡 Este é o valor que efetivamente entrará no caixa após as taxas
                      </p>
                    </div>
                  )}

                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddPaymentSplit}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </div>

                {/* Payment Splits List */}
                {paymentSplits.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Formas de Pagamento Adicionadas</Label>
                    {paymentSplits.map((split, splitIndex) => (
                      <div key={splitIndex} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{formatPaymentMethod(split.paymentMethod)}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {formatCurrency(split.amount)} - {split.installments}x de {formatCurrency(split.amount / split.installments)}
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemovePaymentSplit(splitIndex)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        {/* Installment dates */}
                        {split.installments > 1 && (
                          <div className="space-y-2 pl-4 border-l-2 border-purple-200">
                            <Label className="text-xs text-gray-600 dark:text-gray-400">Datas de Recebimento</Label>
                            {split.installmentDetails.map((installment, instIndex) => (
                              <div key={instIndex} className="flex items-center gap-2">
                                <span className="text-xs text-gray-500 dark:text-gray-400 w-16">
                                  {instIndex + 1}ª parcela:
                                </span>
                                <Input
                                  type="date"
                                  value={installment.dueDate}
                                  onChange={(e) => handleUpdateInstallmentDate(splitIndex, instIndex, e.target.value)}
                                  className="text-xs h-8"
                                />
                                <span className="text-xs text-gray-600 dark:text-gray-400">
                                  {formatCurrency(installment.amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {/* Summary */}
                    <div className="bg-purple-100 border border-purple-300 rounded-lg p-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-medium">Total Pago:</span>
                        <span className="font-bold text-purple-700">
                          {formatCurrency(paymentSplits.reduce((sum, split) => sum + split.amount, 0))}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm mt-1">
                        <span className="font-medium">Falta Pagar:</span>
                        <span className={`font-bold ${
                          (selectedProcedure ? (procedures.find(p => p.id === selectedProcedure)?.price || 0) * parseInt(quantity || '1') : 0) - paymentSplits.reduce((sum, split) => sum + split.amount, 0) === 0
                            ? 'text-green-600'
                            : 'text-orange-600'
                        }`}>
                          {formatCurrency(
                            (selectedProcedure ? (procedures.find(p => p.id === selectedProcedure)?.price || 0) * parseInt(quantity || '1') : 0) - 
                            paymentSplits.reduce((sum, split) => sum + split.amount, 0)
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700">
                Registrar Venda
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Right Column - Sales History */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Vendas</CardTitle>
            <CardDescription>Clique no nome do paciente para ver detalhes das sessões</CardDescription>
            <div className="mt-2">
              <Input
                placeholder="Buscar paciente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {filteredSales.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">Nenhuma venda encontrada</p>
              ) : (
                filteredSales.map(sale => {
                  const pendingCount = sale._count.sessions - sale.completedSessions;
                  return (
                    <div 
                      key={sale.id} 
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-purple-400 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-colors cursor-pointer relative group"
                      onClick={() => openSaleDetails(sale)}
                    >
                      {/* Edit Button */}
                      <button
                        onClick={(e) => openEditSale(sale, e)}
                        className="absolute top-2 right-2 p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:border-purple-400 transition-all shadow-sm hover:shadow-md z-10"
                        title="Editar venda"
                      >
                        <Edit className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </button>

                      <div className="flex justify-between items-start mb-3">
                        <div className="pr-12">
                          <h3 className="font-semibold text-lg text-purple-700 hover:text-purple-900">
                            {sale.patient.name}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(sale.saleDate).toLocaleDateString('pt-BR')}
                            <span className="text-gray-400">•</span>
                            <CreditCard className="h-4 w-4" />
                            {sale.paymentSplits && sale.paymentSplits.length > 0 
                              ? `${sale.paymentSplits.length} forma${sale.paymentSplits.length > 1 ? 's' : ''} de pagamento`
                              : sale.paymentMethod ? paymentMethodLabels[sale.paymentMethod] : 'Não informado'
                            }
                            {sale.installments && sale.installments > 1 && ` (${sale.installments}x)`}
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {sale.items.map(item => `${item.quantity}x ${item.procedure.name}`).join(', ')}
                          </p>
                          {/* Show next scheduled session if available */}
                          {sale.sessions && sale.sessions.length > 0 && (() => {
                            const nextScheduled = sale.sessions
                              .filter((s: Session) => s.status === 'PENDING' && s.scheduledDate)
                              .sort((a: Session, b: Session) => 
                                new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime()
                              )[0];
                            if (nextScheduled) {
                              return (
                                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Próxima sessão: {new Date(nextScheduled.scheduledDate!).toLocaleDateString('pt-BR')}
                                </p>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-purple-600 text-lg">{formatCurrency(sale.totalAmount)}</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${paymentStatusLabels[sale.paymentStatus]?.color || 'bg-gray-100 dark:bg-gray-800'}`}>
                            {paymentStatusLabels[sale.paymentStatus]?.label || sale.paymentStatus}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600 dark:text-gray-400">Progresso do Tratamento</span>
                          <span className="font-medium">
                            <span className="text-green-600">{sale.completedSessions} realizadas</span>
                            {pendingCount > 0 && (
                              <span className="text-orange-500"> • {pendingCount} pendentes</span>
                            )}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                          <div
                            className="bg-green-500 h-2.5 rounded-full transition-all"
                            style={{
                              width: `${sale._count.sessions > 0 ? (sale.completedSessions / sale._count.sessions) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sale Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-8">
              <span>Detalhes da Venda</span>
              {selectedSale && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditSale(selectedSale, e);
                  }}
                  className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:border-purple-400 transition-all shadow-sm hover:shadow-md"
                  title="Editar venda"
                >
                  <Edit className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </button>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedSale && (
            <div className="space-y-6">
              {/* Patient Info */}
              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="font-semibold text-lg text-purple-800 mb-3 flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Dados do Paciente
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Nome</p>
                    <p className="font-medium">{selectedSale.patient.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Telefone/WhatsApp</p>
                    <p className="font-medium flex items-center gap-1">
                      <Phone className="h-4 w-4 text-gray-400" />
                      {selectedSale.patient.phone}
                    </p>
                  </div>
                  {selectedSale.patient.email && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                      <p className="font-medium flex items-center gap-1">
                        <Mail className="h-4 w-4 text-gray-400" />
                        {selectedSale.patient.email}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Sale Info */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Informações da Venda
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Data da Venda</p>
                    <p className="font-medium">{new Date(selectedSale.saleDate).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Valor Total</p>
                    <p className="font-bold text-purple-600 text-xl">{formatCurrency(selectedSale.totalAmount)}</p>
                  </div>
                  
                  {/* Payment Splits Display */}
                  {selectedSale.paymentSplits && selectedSale.paymentSplits.length > 0 ? (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Formas de Pagamento</p>
                      <div className="space-y-2">
                        {selectedSale.paymentSplits.map((split, index) => (
                          <div key={index} className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">{formatPaymentMethod(split.paymentMethod)}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {split.installments === 1 
                                    ? 'À vista' 
                                    : `${split.installments}x de ${formatCurrency(split.amount / split.installments)}`
                                  }
                                </p>
                              </div>
                              <p className="font-bold text-purple-600">{formatCurrency(split.amount)}</p>
                            </div>
                            {split.installmentDetails && split.installmentDetails.length > 1 && (
                              <div className="mt-2 pt-2 border-t border-purple-200">
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Datas de Recebimento:</p>
                                <div className="space-y-1">
                                  {split.installmentDetails.map((inst) => (
                                    <div key={inst.installmentNumber} className="flex justify-between text-xs">
                                      <span>{inst.installmentNumber}ª parcela - {new Date(inst.dueDate).toLocaleDateString('pt-BR')}</span>
                                      <span className="font-medium">{formatCurrency(inst.amount)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Forma de Pagamento</p>
                        <p className="font-medium">
                          {selectedSale.paymentMethod ? paymentMethodLabels[selectedSale.paymentMethod] : 'Não informado'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Parcelamento</p>
                        <p className="font-medium">
                          {selectedSale.installments && selectedSale.installments === 1 
                            ? 'À vista' 
                            : selectedSale.installments 
                              ? `${selectedSale.installments}x de ${formatCurrency(selectedSale.totalAmount / selectedSale.installments)}`
                              : 'Não informado'}
                        </p>
                      </div>
                    </>
                  )}
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Status do Pagamento</p>
                    <span className={`text-sm px-2 py-1 rounded-full ${paymentStatusLabels[selectedSale.paymentStatus]?.color || 'bg-gray-100 dark:bg-gray-800'}`}>
                      {paymentStatusLabels[selectedSale.paymentStatus]?.label || selectedSale.paymentStatus}
                    </span>
                  </div>
                </div>
                {selectedSale.notes && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Observações</p>
                    <p className="text-gray-700 dark:text-gray-300">{selectedSale.notes}</p>
                  </div>
                )}
              </div>

              {/* Sessions */}
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Sessões Adquiridas
                </h3>
                
                {/* Summary */}
                <div className="bg-white dark:bg-gray-900 border rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600 dark:text-gray-400">Total de sessões:</span>
                    <span className="font-bold">{selectedSale.sessions?.length || 0}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600 dark:text-gray-400">Sessões realizadas:</span>
                    <span className="font-bold text-green-600">
                      {selectedSale.sessions?.filter(s => s.status === 'COMPLETED').length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Sessões pendentes:</span>
                    <span className="font-bold text-orange-500">
                      {selectedSale.sessions?.filter(s => s.status === 'PENDING').length || 0}
                    </span>
                  </div>
                </div>

                {/* Sessions List */}
                <div className="space-y-2">
                  {selectedSale.sessions?.map((session, index) => (
                    <div 
                      key={session.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        session.status === 'COMPLETED' 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-orange-50 border-orange-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                          session.status === 'COMPLETED' 
                            ? 'bg-green-200 text-green-800' 
                            : 'bg-orange-200 text-orange-800'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{session.procedure.name}</p>
                          {session.status === 'COMPLETED' && session.completedDate && (
                            <p className="text-sm text-green-600">
                              Realizada em {new Date(session.completedDate).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                          {session.status === 'PENDING' && (
                            <>
                              {session.scheduledDate ? (
                                <p className="text-sm text-orange-600 flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Agendada para {new Date(session.scheduledDate).toLocaleDateString('pt-BR')}
                                </p>
                              ) : (
                                <p className="text-sm text-orange-600">Aguardando agendamento</p>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {session.status === 'COMPLETED' ? (
                          <CheckCircle2 className="h-6 w-6 text-green-600" />
                        ) : (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCompleteSession(session.id);
                            }}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Concluir
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Sale Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-purple-600" />
              Editar Venda
            </DialogTitle>
          </DialogHeader>
          
          {editingSale && (
            <div className="space-y-6">
              {/* Patient Info */}
              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="font-semibold text-lg text-purple-800 mb-2 flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {editingSale.patient.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {editingSale.patient.phone}
                </p>
              </div>

              {/* Procedures and Sessions */}
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Procedimentos e Datas das Sessões
                </h3>
                
                {editingSale.items?.map((item, itemIndex) => (
                  <div key={item.id} className="mb-6 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <div className="mb-4">
                      <h4 className="font-medium text-purple-700 mb-1">
                        {item.procedure.name}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {item.quantity} sessão(ões) • {formatCurrency(item.unitPrice)} cada
                      </p>
                    </div>

                    {/* Sessions for this procedure */}
                    <div className="space-y-2">
                      {editingSale.sessions
                        ?.filter(session => session.procedureId === item.procedureId)
                        .map((session, index) => (
                          <div key={session.id} className={`flex items-center gap-3 p-3 rounded-lg border ${
                            session.status === 'COMPLETED' 
                              ? 'bg-green-50 border-green-200 opacity-70' 
                              : session.status === 'CANCELLED'
                              ? 'bg-red-50 border-red-200 opacity-70'
                              : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                          }`}>
                            {/* Checkbox for cancellation (only for pending/scheduled sessions) */}
                            {session.status !== 'COMPLETED' && session.status !== 'CANCELLED' && (
                              <Checkbox
                                checked={sessionsToCancel.has(session.id)}
                                onCheckedChange={() => toggleSessionForCancellation(session.id)}
                                className="data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                              />
                            )}
                            
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                              session.status === 'COMPLETED' 
                                ? 'bg-green-200 text-green-800' 
                                : session.status === 'CANCELLED'
                                ? 'bg-red-200 text-red-800'
                                : 'bg-purple-200 text-purple-800'
                            }`}>
                              {session.status === 'CANCELLED' ? <XCircle className="h-4 w-4" /> : index + 1}
                            </div>
                            
                            {session.status === 'COMPLETED' ? (
                              <div className="flex-1">
                                <p className="text-sm font-medium text-green-700">
                                  Sessão Concluída
                                </p>
                                <p className="text-xs text-green-600">
                                  Realizada em {session.completedDate ? new Date(session.completedDate).toLocaleDateString('pt-BR') : '-'}
                                </p>
                              </div>
                            ) : session.status === 'CANCELLED' ? (
                              <div className="flex-1">
                                <p className="text-sm font-medium text-red-700">
                                  Sessão Cancelada
                                </p>
                                <p className="text-xs text-red-600">
                                  Esta sessão foi cancelada
                                </p>
                              </div>
                            ) : (
                              <div className="flex-1 flex items-center gap-3">
                                <div className="flex-1">
                                  <Label htmlFor={`edit-session-${session.id}`} className="text-xs text-gray-600 dark:text-gray-400">
                                    Data Agendada
                                  </Label>
                                  <Input
                                    id={`edit-session-${session.id}`}
                                    type="date"
                                    value={editSessionDates[session.id] || ''}
                                    onChange={(e) => handleUpdateEditSessionDate(session.id, e.target.value)}
                                    className="mt-1"
                                    disabled={sessionsToCancel.has(session.id)}
                                  />
                                </div>
                                {session.scheduledDate && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    Atual: {new Date(session.scheduledDate).toLocaleDateString('pt-BR')}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Cancellation Warning */}
              {sessionsToCancel.size > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-red-900">
                        {sessionsToCancel.size} sessão(ões) selecionada(s) para cancelamento
                      </p>
                      <p className="text-sm text-red-700 mt-1">
                        Clique no botão "Cancelar Sessões Selecionadas" para confirmar o cancelamento. Esta ação não pode ser desfeita.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 pt-4 border-t">
                {sessionsToCancel.size > 0 && (
                  <Button
                    onClick={handleCancelSelectedSessions}
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancelar {sessionsToCancel.size} Sessão(ões) Selecionada(s)
                  </Button>
                )}
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleSaveEditedSale}
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                  >
                    Salvar Alterações
                  </Button>
                  <Button
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setEditingSale(null);
                      setEditSessionDates({});
                      setSessionsToCancel(new Set());
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Fechar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
