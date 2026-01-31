'use client';

import { useEffect, useState, useMemo } from 'react';
import { format, addDays, addWeeks, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Calendar as CalendarIcon, 
  Search, 
  Filter, 
  Clock, 
  User, 
  Stethoscope,
  Users,
  ChevronDown,
  ArrowUpDown,
  RefreshCw,
  Download
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { SessionStatus } from '@prisma/client';

interface Appointment {
  id: string;
  scheduledDate: string | null;
  completedDate: string | null;
  status: SessionStatus;
  appointmentType: string | null;
  notes: string | null;
  collaboratorId: string | null;
  procedure: {
    id: string;
    name: string;
    duration: number;
    color?: string | null;
  };
  sale: {
    id: string;
    patient: {
      id: string;
      name: string;
      phone: string;
      email?: string | null;
    };
    seller?: {
      id: string;
      name: string;
    } | null;
  };
}

interface Stats {
  total: number;
  pending: number;
  scheduled: number;
  completed: number;
  cancelled: number;
  uniquePatients: number;
  procedureCounts: Record<string, number>;
}

interface Collaborator {
  id: string;
  name: string;
}

interface Patient {
  id: string;
  name: string;
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  SCHEDULED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const statusLabels: Record<string, string> = {
  PENDING: 'Pendente',
  SCHEDULED: 'Agendado',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
};

export default function FutureAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);

  // Filter states
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(addMonths(new Date(), 1));
  const [collaboratorId, setCollaboratorId] = useState<string>('all');
  const [patientId, setPatientId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState('scheduledDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Fetch collaborators and patients for dropdowns
  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        const [collabRes, patientRes] = await Promise.all([
          fetch('/api/collaborators'),
          fetch('/api/patients'),
        ]);
        
        if (collabRes.ok) {
          const data = await collabRes.json();
          setCollaborators(data);
        }
        if (patientRes.ok) {
          const data = await patientRes.json();
          setPatients(data);
        }
      } catch (error) {
        console.error('Error fetching filter data:', error);
      }
    };

    fetchFilterData();
  }, []);

  // Fetch appointments
  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        ...(endDate && { endDate: endDate.toISOString() }),
        ...(collaboratorId !== 'all' && { collaboratorId }),
        ...(patientId !== 'all' && { patientId }),
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        sortBy,
        sortOrder,
      });

      const response = await fetch(`/api/agenda/futuros?${params}`);
      if (!response.ok) throw new Error('Erro ao buscar agendamentos');
      
      const data = await response.json();
      setAppointments(data.appointments || []);
      setStats(data.stats || null);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Erro ao carregar agendamentos futuros');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [startDate, endDate, collaboratorId, patientId, statusFilter, sortBy, sortOrder]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== '') {
        fetchAppointments();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Handle quick date range selections
  const handleQuickDateRange = (range: string) => {
    const today = new Date();
    setStartDate(today);
    
    switch (range) {
      case 'week':
        setEndDate(addWeeks(today, 1));
        break;
      case 'month':
        setEndDate(addMonths(today, 1));
        break;
      case '3months':
        setEndDate(addMonths(today, 3));
        break;
      case 'all':
        setEndDate(null);
        break;
    }
  };

  // Toggle sort
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // Export to CSV
  const exportToCsv = () => {
    const headers = ['Data/Hora', 'Paciente', 'Telefone', 'Procedimento', 'Duração', 'Status', 'Observações'];
    const rows = appointments.map(apt => [
      apt.scheduledDate ? format(new Date(apt.scheduledDate), 'dd/MM/yyyy HH:mm') : 'Não agendado',
      apt.sale.patient.name,
      apt.sale.patient.phone,
      apt.procedure.name,
      `${apt.procedure.duration} min`,
      statusLabels[apt.status],
      apt.notes || '',
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `agendamentos_futuros_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Agendamentos Futuros
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Visualize e gerencie todos os agendamentos futuros da clínica
        </p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-purple-600">{stats.total}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Pendentes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-blue-600">{stats.scheduled}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Agendados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Concluídos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Cancelados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-indigo-600">{stats.uniquePatients}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Pacientes</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Range */}
            <div className="space-y-2">
              <Label>Período</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(startDate, 'dd/MM/yyyy', { locale: ptBR })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => date && setStartDate(date)}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Sem limite'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate || undefined}
                      onSelect={(date) => setEndDate(date || null)}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex gap-1 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => handleQuickDateRange('week')}>
                  7 dias
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleQuickDateRange('month')}>
                  30 dias
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleQuickDateRange('3months')}>
                  3 meses
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleQuickDateRange('all')}>
                  Todos
                </Button>
              </div>
            </div>

            {/* Collaborator Filter */}
            <div className="space-y-2">
              <Label>Colaborador</Label>
              <Select value={collaboratorId} onValueChange={setCollaboratorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {collaborators.map((collab) => (
                    <SelectItem key={collab.id} value={collab.id}>
                      {collab.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Patient Filter */}
            <div className="space-y-2">
              <Label>Paciente</Label>
              <Select value={patientId} onValueChange={setPatientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="PENDING">Pendente</SelectItem>
                  <SelectItem value="SCHEDULED">Agendado</SelectItem>
                  <SelectItem value="COMPLETED">Concluído</SelectItem>
                  <SelectItem value="CANCELLED">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Search and Actions */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por paciente ou procedimento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchAppointments}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
              <Button variant="outline" onClick={exportToCsv}>
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appointments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lista de Agendamentos</CardTitle>
          <CardDescription>
            {appointments.length} agendamento(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Carregando agendamentos...
            </div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Nenhum agendamento encontrado com os filtros selecionados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleSort('scheduledDate')}
                    >
                      <div className="flex items-center gap-1">
                        Data/Hora
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleSort('patientName')}
                    >
                      <div className="flex items-center gap-1">
                        Paciente
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleSort('procedureName')}
                    >
                      <div className="flex items-center gap-1">
                        Procedimento
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Contato</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map((apt) => (
                    <TableRow key={apt.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <div>
                            {apt.scheduledDate ? (
                              <>
                                <div className="font-medium">
                                  {format(new Date(apt.scheduledDate), "dd/MM/yyyy", { locale: ptBR })}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {format(new Date(apt.scheduledDate), "HH:mm")}
                                </div>
                              </>
                            ) : (
                              <span className="text-gray-400">Não agendado</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="font-medium">{apt.sale.patient.name}</div>
                            {apt.sale.seller && (
                              <div className="text-xs text-gray-500">
                                Vendedor: {apt.sale.seller.name}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {apt.procedure.color && (
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: apt.procedure.color }}
                            />
                          )}
                          <span>{apt.procedure.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {apt.procedure.duration} min
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[apt.status]}>
                          {statusLabels[apt.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{apt.sale.patient.phone}</div>
                          {apt.sale.patient.email && (
                            <div className="text-gray-500 truncate max-w-[150px]">
                              {apt.sale.patient.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Procedure Breakdown */}
      {stats && Object.keys(stats.procedureCounts).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              Procedimentos por Quantidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(stats.procedureCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([name, count]) => (
                  <div 
                    key={name} 
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <span className="text-sm font-medium truncate">{name}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
