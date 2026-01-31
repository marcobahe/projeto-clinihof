'use client';

import { useEffect, useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, addWeeks, isSameDay, isSameMonth, startOfDay, endOfDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User, Edit2, Check, X, Plus, CalendarPlus, ListFilter } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { SessionStatus, AppointmentType } from '@prisma/client';
import { AppointmentModal } from '@/components/forms/appointment-modal';

type ViewMode = 'month' | 'week' | 'day';

interface Appointment {
  id: string;
  scheduledDate: string | null;
  completedDate: string | null;
  status: SessionStatus;
  appointmentType: AppointmentType | null;
  notes: string | null;
  procedure: {
    id: string;
    name: string;
    color?: string | null;
  };
  sale: {
    id: string;
    patient: {
      id: string;
      name: string;
      phone: string;
    };
  };
}

// Helper function to get procedure color style
const getProcedureColorStyle = (color?: string | null) => {
  if (!color) return {};
  return {
    borderLeftColor: color,
    borderLeftWidth: '4px',
    borderLeftStyle: 'solid' as const,
    backgroundColor: `${color}15`, // Very light background
  };
};

interface PatientStats {
  patientId: string;
  patientName: string;
  attended: number;
  missed: number;
  scheduled: number;
  totalSessions: number;
}

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  SCHEDULED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const statusLabels = {
  PENDING: 'Pendente',
  SCHEDULED: 'Agendado',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
};

// Cores e labels para tipos de consulta
const appointmentTypeColors = {
  FIRST_VISIT: 'border-l-4 border-red-500 bg-red-50 dark:bg-red-900/10',
  PAYMENT_PENDING: 'border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10',
  FOLLOW_UP: 'border-l-4 border-green-500 bg-green-50 dark:bg-green-900/10',
};

const appointmentTypeBadgeColors = {
  FIRST_VISIT: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  PAYMENT_PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  FOLLOW_UP: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};

const appointmentTypeLabels = {
  FIRST_VISIT: '🔴 Primeira Consulta',
  PAYMENT_PENDING: '🟡 Pendência Financeira',
  FOLLOW_UP: '🟢 Retorno/Acompanhamento',
};

const appointmentTypeDescriptions = {
  FIRST_VISIT: 'Paciente novo - Processo de conversão',
  PAYMENT_PENDING: 'Cobrança em aberto - Verificar recebíveis',
  FOLLOW_UP: 'Consulta de retorno - Acompanhamento',
};

export default function AgendaPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [attendedPatients, setAttendedPatients] = useState<PatientStats[]>([]);
  const [missedPatients, setMissedPatients] = useState<PatientStats[]>([]);

  // Form states para edição
  const [editScheduledDate, setEditScheduledDate] = useState('');
  const [editStatus, setEditStatus] = useState<SessionStatus>('PENDING');
  const [editAppointmentType, setEditAppointmentType] = useState<AppointmentType | null>(null);
  const [editNotes, setEditNotes] = useState('');

  // Estados para criação de agendamento
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalDate, setCreateModalDate] = useState<Date | undefined>(undefined);
  const [createModalTime, setCreateModalTime] = useState<string | undefined>(undefined);

  // Abrir modal de criação ao clicar em um slot
  const handleSlotClick = (date: Date, time?: string) => {
    setCreateModalDate(date);
    setCreateModalTime(time);
    setIsCreateModalOpen(true);
  };

  // Callback quando agendamento é criado com sucesso
  const handleAppointmentCreated = () => {
    fetchAppointments();
    fetchMonthStats();
  };

  // Buscar agendamentos
  const fetchAppointments = async () => {
    try {
      setLoading(true);
      let startDate: Date;
      let endDate: Date;

      if (viewMode === 'month') {
        startDate = startOfMonth(currentDate);
        endDate = endOfMonth(currentDate);
      } else if (viewMode === 'week') {
        startDate = startOfWeek(currentDate, { locale: ptBR });
        endDate = endOfWeek(currentDate, { locale: ptBR });
      } else {
        startDate = startOfDay(currentDate);
        endDate = endOfDay(currentDate);
      }

      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        view: viewMode,
      });

      const response = await fetch(`/api/agenda?${params}`);
      if (!response.ok) throw new Error('Erro ao buscar agendamentos');
      
      const data = await response.json();
      setAppointments(data.appointments || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Erro ao carregar agendamentos');
    } finally {
      setLoading(false);
    }
  };

  // Buscar estatísticas do mês
  const fetchMonthStats = async () => {
    try {
      const startDate = startOfMonth(currentDate);
      const endDate = endOfMonth(currentDate);

      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      const response = await fetch(`/api/agenda/stats?${params}`);
      if (!response.ok) throw new Error('Erro ao buscar estatísticas');
      
      const data = await response.json();
      setAttendedPatients(data.attendedPatients || []);
      setMissedPatients(data.missedPatients || []);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchMonthStats();
  }, [currentDate, viewMode]);

  // Navegação de período
  const handlePrevious = () => {
    if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, -1));
    } else if (viewMode === 'week') {
      setCurrentDate(addWeeks(currentDate, -1));
    } else {
      setCurrentDate(addDays(currentDate, -1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Gerar dias do calendário para visualização mensal
  const generateCalendarDays = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { locale: ptBR });
    const endDate = endOfWeek(monthEnd, { locale: ptBR });

    const days = [];
    let day = startDate;

    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }

    return days;
  };

  // Gerar dias para visualização semanal
  const generateWeekDays = () => {
    const weekStart = startOfWeek(currentDate, { locale: ptBR });
    const days = [];

    for (let i = 0; i < 7; i++) {
      days.push(addDays(weekStart, i));
    }

    return days;
  };

  // Obter agendamentos de um dia específico
  const getAppointmentsForDay = (day: Date) => {
    return appointments.filter((apt) => {
      if (!apt.scheduledDate) return false;
      return isSameDay(parseISO(apt.scheduledDate), day);
    });
  };

  // Abrir diálogo de edição
  const handleEditAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setEditScheduledDate(appointment.scheduledDate ? format(parseISO(appointment.scheduledDate), "yyyy-MM-dd'T'HH:mm") : '');
    setEditStatus(appointment.status);
    setEditAppointmentType(appointment.appointmentType);
    setEditNotes(appointment.notes || '');
    setIsEditDialogOpen(true);
  };

  // Salvar edição
  const handleSaveEdit = async () => {
    if (!selectedAppointment) return;

    try {
      const response = await fetch('/api/agenda', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: selectedAppointment.id,
          scheduledDate: editScheduledDate || null,
          status: editStatus,
          appointmentType: editAppointmentType,
          notes: editNotes || null,
        }),
      });

      if (!response.ok) throw new Error('Erro ao atualizar agendamento');

      toast.success('Agendamento atualizado com sucesso!');
      setIsEditDialogOpen(false);
      fetchAppointments();
      fetchMonthStats();
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast.error('Erro ao atualizar agendamento');
    }
  };

  // Renderizar calendário mensal
  const renderMonthView = () => {
    const days = generateCalendarDays();
    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Cabeçalho dos dias da semana */}
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
          {weekDays.map((day) => (
            <div
              key={day}
              className="p-2 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Grade do calendário */}
        <div className="grid grid-cols-7">
          {days.map((day, index) => {
            const dayAppointments = getAppointmentsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, new Date());
            const isSelected = isSameDay(day, selectedDate);

            return (
              <div
                key={index}
                onClick={() => {
                  setSelectedDate(day);
                }}
                onDoubleClick={() => {
                  handleSlotClick(day, '09:00');
                }}
                className={`min-h-[100px] p-2 border-b border-r border-gray-200 dark:border-gray-700 cursor-pointer transition-colors ${
                  !isCurrentMonth ? 'bg-gray-50 dark:bg-gray-800/50' : ''
                } ${
                  isSelected ? 'bg-purple-50 dark:bg-purple-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                title="Clique duplo para criar agendamento"
              >
                <div className="flex justify-between items-start mb-1">
                  <span
                    className={`text-sm font-medium ${
                      !isCurrentMonth
                        ? 'text-gray-400 dark:text-gray-600'
                        : isToday
                        ? 'bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center'
                        : 'text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                  <div className="flex items-center gap-1">
                    {dayAppointments.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {dayAppointments.length}
                      </Badge>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSlotClick(day, '09:00');
                      }}
                      className="opacity-0 group-hover:opacity-100 hover:opacity-100 p-0.5 rounded hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-opacity"
                      title="Criar agendamento"
                    >
                      <Plus className="h-3 w-3 text-purple-600" />
                    </button>
                  </div>
                </div>

                {/* Lista de agendamentos do dia (máx 2 visíveis) */}
                <div className="space-y-1">
                  {dayAppointments.slice(0, 2).map((apt) => (
                    <div
                      key={apt.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditAppointment(apt);
                      }}
                      style={getProcedureColorStyle(apt.procedure.color)}
                      className={`text-xs p-1 rounded truncate ${!apt.procedure.color ? statusColors[apt.status] : ''} ${!apt.procedure.color && apt.appointmentType ? appointmentTypeColors[apt.appointmentType] : ''} cursor-pointer hover:opacity-80`}
                    >
                      {apt.scheduledDate && format(parseISO(apt.scheduledDate), 'HH:mm')} - {apt.sale.patient.name}
                    </div>
                  ))}
                  {dayAppointments.length > 2 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 pl-1">
                      +{dayAppointments.length - 2} mais
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Renderizar visualização semanal
  const renderWeekView = () => {
    const days = generateWeekDays();

    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700">
          {days.map((day) => {
            const dayAppointments = getAppointmentsForDay(day);
            const isToday = isSameDay(day, new Date());

            return (
              <div key={day.toISOString()} className="bg-white dark:bg-gray-900 min-h-[400px]">
                <div className={`p-3 border-b border-gray-200 dark:border-gray-700 ${
                  isToday ? 'bg-purple-50 dark:bg-purple-900/20' : ''
                }`}>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {format(day, 'EEE', { locale: ptBR })}
                  </div>
                  <div className={`text-lg font-semibold ${
                    isToday
                      ? 'text-purple-600 dark:text-purple-400'
                      : 'text-gray-900 dark:text-gray-100'
                  }`}>
                    {format(day, 'd')}
                  </div>
                </div>
                <div className="p-2 space-y-2">
                  {dayAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      onClick={() => handleEditAppointment(apt)}
                      className={`p-2 rounded-lg cursor-pointer hover:opacity-80 ${statusColors[apt.status]} ${apt.appointmentType ? appointmentTypeColors[apt.appointmentType] : ''}`}
                    >
                      <div className="font-medium text-sm">
                        {apt.scheduledDate && format(parseISO(apt.scheduledDate), 'HH:mm')}
                      </div>
                      <div className="text-xs mt-1">{apt.sale.patient.name}</div>
                      <div className="text-xs mt-1 opacity-75">{apt.procedure.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Renderizar visualização diária
  const renderDayView = () => {
    const dayAppointments = getAppointmentsForDay(currentDate);

    return (
      <Card>
        <CardHeader>
          <CardTitle>Agendamentos do Dia</CardTitle>
          <CardDescription>
            {format(currentDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dayAppointments.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Nenhum agendamento para este dia
            </div>
          ) : (
            <div className="space-y-3">
              {dayAppointments.map((apt) => (
                <div
                  key={apt.id}
                  onClick={() => handleEditAppointment(apt)}
                  className={`flex items-start gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 cursor-pointer transition-colors ${apt.appointmentType ? appointmentTypeColors[apt.appointmentType] : ''}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {apt.scheduledDate && format(parseISO(apt.scheduledDate), 'HH:mm')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <span className="text-gray-900 dark:text-gray-100">{apt.sale.patient.name}</span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {apt.procedure.name}
                    </div>
                    {apt.notes && (
                      <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {apt.notes}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Badge className={statusColors[apt.status]}>
                      {statusLabels[apt.status]}
                    </Badge>
                    {apt.appointmentType && (
                      <Badge className={appointmentTypeBadgeColors[apt.appointmentType]}>
                        {appointmentTypeLabels[apt.appointmentType]}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Agenda
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gerencie seus agendamentos e acompanhe o comparecimento dos pacientes
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/agenda/futuros">
            <Button variant="outline">
              <ListFilter className="h-4 w-4 mr-2" />
              Ver Futuros
            </Button>
          </Link>
          <Button 
            onClick={() => handleSlotClick(new Date())} 
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Agendamento
          </Button>
        </div>
      </div>

      {/* Legenda de Classificação de Consultas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Classificação Visual de Consultas</CardTitle>
          <CardDescription>
            Identifique rapidamente o tipo de cada consulta através das cores na borda esquerda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3 p-3 rounded-lg border-l-4 border-red-500 bg-red-50 dark:bg-red-900/10">
              <div>
                <div className="font-semibold text-red-800 dark:text-red-400 mb-1">
                  🔴 Primeira Consulta
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Paciente novo em processo de conversão e diagnóstico inicial
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10">
              <div>
                <div className="font-semibold text-yellow-800 dark:text-yellow-400 mb-1">
                  🟡 Pendência Financeira
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Consulta com cobrança em aberto ou pagamento pendente
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg border-l-4 border-green-500 bg-green-50 dark:bg-green-900/10">
              <div>
                <div className="font-semibold text-green-800 dark:text-green-400 mb-1">
                  🟢 Retorno/Acompanhamento
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Consulta de retorno para continuidade do tratamento
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Controles do Calendário */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Navegação de período */}
            <div className="flex items-center gap-2">
              <Button onClick={handlePrevious} variant="outline" size="sm">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button onClick={handleToday} variant="outline" size="sm">
                Hoje
              </Button>
              <Button onClick={handleNext} variant="outline" size="sm">
                <ChevronRight className="h-4 w-4" />
              </Button>
              <div className="ml-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                {viewMode === 'month' && format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
                {viewMode === 'week' && (
                  `${format(startOfWeek(currentDate, { locale: ptBR }), 'd MMM', { locale: ptBR })} - ${format(endOfWeek(currentDate, { locale: ptBR }), 'd MMM yyyy', { locale: ptBR })}`
                )}
                {viewMode === 'day' && format(currentDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </div>
            </div>

            {/* Seletor de visualização */}
            <div className="flex gap-2">
              <Button
                onClick={() => setViewMode('month')}
                variant={viewMode === 'month' ? 'default' : 'outline'}
                size="sm"
                className={viewMode === 'month' ? 'bg-purple-600 hover:bg-purple-700' : ''}
              >
                Mês
              </Button>
              <Button
                onClick={() => setViewMode('week')}
                variant={viewMode === 'week' ? 'default' : 'outline'}
                size="sm"
                className={viewMode === 'week' ? 'bg-purple-600 hover:bg-purple-700' : ''}
              >
                Semana
              </Button>
              <Button
                onClick={() => setViewMode('day')}
                variant={viewMode === 'day' ? 'default' : 'outline'}
                size="sm"
                className={viewMode === 'day' ? 'bg-purple-600 hover:bg-purple-700' : ''}
              >
                Dia
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendário */}
      {loading ? (
        <Card>
          <CardContent className="p-8">
            <div className="text-center text-gray-500 dark:text-gray-400">
              Carregando agendamentos...
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {viewMode === 'month' && renderMonthView()}
          {viewMode === 'week' && renderWeekView()}
          {viewMode === 'day' && renderDayView()}
        </>
      )}

      {/* Listas de Comparecimento */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pacientes que Compareceram */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              Compareceram este Mês
            </CardTitle>
            <CardDescription>
              Pacientes que concluíram pelo menos uma sessão
            </CardDescription>
          </CardHeader>
          <CardContent>
            {attendedPatients.length === 0 ? (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                Nenhum paciente compareceu ainda
              </div>
            ) : (
              <div className="space-y-3">
                {attendedPatients.map((patient) => (
                  <div
                    key={patient.patientId}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {patient.patientName}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {patient.attended} sessões concluídas
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      {Math.round((patient.attended / patient.totalSessions) * 100)}%
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pacientes que Não Compareceram */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <X className="h-5 w-5 text-red-600" />
              Não Compareceram este Mês
            </CardTitle>
            <CardDescription>
              Pacientes com sessões agendadas ou canceladas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {missedPatients.length === 0 ? (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                Todos os pacientes compareceram!
              </div>
            ) : (
              <div className="space-y-3">
                {missedPatients.map((patient) => (
                  <div
                    key={patient.patientId}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {patient.patientName}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {patient.missed} canceladas, {patient.scheduled} agendadas
                      </div>
                    </div>
                    <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                      0%
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Diálogo de Edição de Agendamento */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Agendamento</DialogTitle>
            <DialogDescription>
              Altere a data, status ou adicione observações ao agendamento
            </DialogDescription>
          </DialogHeader>

          {selectedAppointment && (
            <div className="space-y-4 py-4">
              {/* Informações do Paciente */}
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {selectedAppointment.sale.patient.name}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedAppointment.procedure.name}
                </div>
              </div>

              {/* Data e Hora */}
              <div>
                <Label htmlFor="scheduledDate" className="text-gray-900 dark:text-gray-200">
                  Data e Hora
                </Label>
                <Input
                  id="scheduledDate"
                  type="datetime-local"
                  value={editScheduledDate}
                  onChange={(e) => setEditScheduledDate(e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Status */}
              <div>
                <Label htmlFor="status" className="text-gray-900 dark:text-gray-200">
                  Status
                </Label>
                <Select value={editStatus} onValueChange={(value) => setEditStatus(value as SessionStatus)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pendente</SelectItem>
                    <SelectItem value="SCHEDULED">Agendado</SelectItem>
                    <SelectItem value="COMPLETED">Concluído</SelectItem>
                    <SelectItem value="CANCELLED">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo de Consulta */}
              <div>
                <Label htmlFor="appointmentType" className="text-gray-900 dark:text-gray-200">
                  Tipo de Consulta
                </Label>
                <Select 
                  value={editAppointmentType || 'none'} 
                  onValueChange={(value) => setEditAppointmentType(value === 'none' ? null : value as AppointmentType)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não classificado</SelectItem>
                    <SelectItem value="FIRST_VISIT">
                      <div className="flex flex-col">
                        <span>{appointmentTypeLabels.FIRST_VISIT}</span>
                        <span className="text-xs text-gray-500">{appointmentTypeDescriptions.FIRST_VISIT}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="PAYMENT_PENDING">
                      <div className="flex flex-col">
                        <span>{appointmentTypeLabels.PAYMENT_PENDING}</span>
                        <span className="text-xs text-gray-500">{appointmentTypeDescriptions.PAYMENT_PENDING}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="FOLLOW_UP">
                      <div className="flex flex-col">
                        <span>{appointmentTypeLabels.FOLLOW_UP}</span>
                        <span className="text-xs text-gray-500">{appointmentTypeDescriptions.FOLLOW_UP}</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Observações */}
              <div>
                <Label htmlFor="notes" className="text-gray-900 dark:text-gray-200">
                  Observações
                </Label>
                <Textarea
                  id="notes"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Adicione observações sobre o agendamento..."
                  className="mt-1"
                  rows={3}
                />
              </div>

              {/* Botões de Ação */}
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Salvar Alterações
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Criação de Agendamento */}
      <AppointmentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleAppointmentCreated}
        preselectedDate={createModalDate}
        preselectedTime={createModalTime}
      />
    </div>
  );
}
