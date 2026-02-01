'use client';

import { useEffect, useState, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, addWeeks, isSameDay, isSameMonth, startOfDay, endOfDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User, Edit2, Check, X, Plus, CalendarPlus, ListFilter, Tag as TagIcon, Filter, Eye, EyeOff, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
// Tipos inline para evitar importar @prisma/client no browser
type SessionStatus = 'PENDING' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
type AppointmentType = 'FIRST_VISIT' | 'PAYMENT_PENDING' | 'FOLLOW_UP';
import { AppointmentModal } from '@/components/forms/appointment-modal';
import { CalendarEventModal } from '@/components/calendar-event-modal';
import { TagManager } from '@/components/tag-manager';

// Hook para detectar viewport mobile
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < breakpoint);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint]);

  return isMobile;
}

interface TagWithCount {
  id: string;
  name: string;
  color: string;
  _count?: { events: number };
}

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

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  tagId: string | null;
  tag: {
    id: string;
    name: string;
    color: string;
  } | null;
  createdBy: {
    id: string;
    fullName: string;
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

// Helper to format last sync time as relative time
function formatSyncTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'agora';
  if (diffMin === 1) return 'há 1 min';
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours === 1) return 'há 1 hora';
  if (diffHours < 24) return `há ${diffHours} horas`;
  return format(date, "dd/MM HH:mm");
}

export default function AgendaPage() {
  const isMobile = useIsMobile();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [hasSetInitialView, setHasSetInitialView] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [attendedPatients, setAttendedPatients] = useState<PatientStats[]>([]);
  const [missedPatients, setMissedPatients] = useState<PatientStats[]>([]);

  // Estado para filtro de tags
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [showNoTag, setShowNoTag] = useState(true);
  const [isTagFilterInit, setIsTagFilterInit] = useState(false);

  // Form states para edição
  const [editScheduledDate, setEditScheduledDate] = useState('');
  const [editStatus, setEditStatus] = useState<SessionStatus>('PENDING');
  const [editAppointmentType, setEditAppointmentType] = useState<AppointmentType | null>(null);
  const [editNotes, setEditNotes] = useState('');

  // Refresh key - incrementado após mutações para forçar refetch
  const [refreshKey, setRefreshKey] = useState(0);

  // Google Calendar polling states
  const [googleCalendarEnabled, setGoogleCalendarEnabled] = useState(false);
  const [lastGoogleSync, setLastGoogleSync] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Estados para criação de agendamento
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalDate, setCreateModalDate] = useState<Date | undefined>(undefined);
  const [createModalTime, setCreateModalTime] = useState<string | undefined>(undefined);

  // Estados para eventos do calendário
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventModalDate, setEventModalDate] = useState<Date | undefined>(undefined);
  const [eventModalEndDate, setEventModalEndDate] = useState<Date | undefined>(undefined);
  const [eventModalTime, setEventModalTime] = useState<string | undefined>(undefined);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  // Estado para tag manager
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);

  // Auto-switch para day view no mobile na primeira renderização
  useEffect(() => {
    if (!hasSetInitialView && isMobile) {
      setViewMode('day');
      setHasSetInitialView(true);
    } else if (!hasSetInitialView && !isMobile) {
      setHasSetInitialView(true);
    }
  }, [isMobile, hasSetInitialView]);

  // Check if Google Calendar is enabled in workspace settings
  useEffect(() => {
    const checkGoogleCalendarSettings = async () => {
      try {
        const response = await fetch('/api/settings', { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          setGoogleCalendarEnabled(!!data.googleCalendarEnabled && !!data.googleCalendarId);
          if (data.lastGoogleSync) {
            setLastGoogleSync(new Date(data.lastGoogleSync));
          }
        }
      } catch {
        // Silently ignore - polling won't start if we can't check
      }
    };
    checkGoogleCalendarSettings();
  }, []);

  // Google Calendar sync function (used by both polling and manual trigger)
  const syncGoogleCalendar = useCallback(async (manual = false) => {
    if (isSyncing) return;
    try {
      setIsSyncing(true);
      const now = new Date();
      const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days ahead

      const response = await fetch('/api/google-calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pull',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setLastGoogleSync(new Date());
        if (data.synced > 0) {
          setRefreshKey((k) => k + 1);
          if (manual) {
            toast.success(`${data.synced} evento${data.synced > 1 ? 's' : ''} sincronizado${data.synced > 1 ? 's' : ''} do Google Calendar`);
          }
        } else if (manual) {
          toast.success('Google Calendar já está sincronizado');
        }
      } else if (manual) {
        toast.error('Erro ao sincronizar com Google Calendar');
      }
    } catch {
      if (manual) {
        toast.error('Erro ao sincronizar com Google Calendar');
      }
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  // Google Calendar polling - every 5 minutes
  useEffect(() => {
    if (!googleCalendarEnabled) return;

    // Run immediately on mount, then every 5 minutes
    syncGoogleCalendar(false);
    const intervalId = setInterval(() => syncGoogleCalendar(false), 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [googleCalendarEnabled, syncGoogleCalendar]);

  // Buscar tags para o filtro
  const fetchTags = useCallback(async () => {
    try {
      const response = await fetch('/api/tags', { cache: 'no-store' });
      if (response.ok) {
        const data: TagWithCount[] = await response.json();
        setTags(data);
        // Inicializar com todas selecionadas
        if (!isTagFilterInit) {
          setSelectedTagIds(new Set(data.map((t) => t.id)));
          setShowNoTag(true);
          setIsTagFilterInit(true);
        }
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  }, [isTagFilterInit]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  // Toggle de uma tag individual no filtro
  const toggleTagFilter = (tagId: string) => {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }
      return next;
    });
  };

  // Selecionar/desselecionar todas
  const toggleAllTags = () => {
    const allSelected = selectedTagIds.size === tags.length && showNoTag;
    if (allSelected) {
      setSelectedTagIds(new Set());
      setShowNoTag(false);
    } else {
      setSelectedTagIds(new Set(tags.map((t) => t.id)));
      setShowNoTag(true);
    }
  };

  // Filtrar eventos do calendário baseado nas tags selecionadas
  const filterEventsByTags = (events: CalendarEvent[]) => {
    return events.filter((evt) => {
      if (!evt.tagId) return showNoTag;
      return selectedTagIds.has(evt.tagId);
    });
  };

  const activeFilterCount = selectedTagIds.size + (showNoTag ? 1 : 0);
  const totalFilterCount = tags.length + 1; // +1 para "sem tag"

  // Abrir modal de criação ao clicar em um slot
  const handleSlotClick = (date: Date, time?: string) => {
    setCreateModalDate(date);
    setCreateModalTime(time);
    setIsCreateModalOpen(true);
  };

  // Callback quando agendamento é criado com sucesso
  const handleAppointmentCreated = () => {
    setRefreshKey((k) => k + 1);
  };

  // Abrir modal de evento do calendário ao clicar em um dia
  const handleDayClickForEvent = (date: Date, time?: string) => {
    setEditingEvent(null);
    setEventModalDate(date);
    setEventModalEndDate(undefined);
    setEventModalTime(time);
    setIsEventModalOpen(true);
  };

  // Editar evento existente
  const handleEditCalendarEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    setEventModalDate(undefined);
    setEventModalEndDate(undefined);
    setEventModalTime(undefined);
    setIsEventModalOpen(true);
  };

  // Callback quando evento é criado/editado com sucesso
  const handleEventSuccess = () => {
    setRefreshKey((k) => k + 1);
  };

  // Buscar eventos do calendário
  const fetchCalendarEvents = async () => {
    try {
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
      });

      const response = await fetch(`/api/calendar-events?${params}`, { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        setCalendarEvents(data);
      }
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    }
  };

  // Obter eventos do calendário para um dia específico (com filtro de tags aplicado)
  const getCalendarEventsForDay = (day: Date) => {
    const dayEvents = calendarEvents.filter((evt) => {
      const start = parseISO(evt.startDate);
      const end = parseISO(evt.endDate);
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);
      return start <= dayEnd && end >= dayStart;
    });
    return filterEventsByTags(dayEvents);
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

      const response = await fetch(`/api/agenda?${params}`, { cache: 'no-store' });
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

      const response = await fetch(`/api/agenda/stats?${params}`, { cache: 'no-store' });
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
    fetchCalendarEvents();
    fetchTags();
  }, [currentDate, viewMode, refreshKey]);

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
      setRefreshKey((k) => k + 1);
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast.error('Erro ao atualizar agendamento');
    }
  };

  // Renderizar calendário mensal
  const renderMonthView = () => {
    const days = generateCalendarDays();
    const weekDaysFull = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const weekDaysMobile = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
    const weekDays = isMobile ? weekDaysMobile : weekDaysFull;

    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Cabeçalho dos dias da semana */}
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
          {weekDays.map((day, i) => (
            <div
              key={i}
              className="p-1 sm:p-2 text-center text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Grade do calendário */}
        <div className="grid grid-cols-7">
          {days.map((day, index) => {
            const dayAppointments = getAppointmentsForDay(day);
            const dayEvents = getCalendarEventsForDay(day);
            const totalItems = dayAppointments.length + dayEvents.length;
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, new Date());
            const isSelected = isSameDay(day, selectedDate);

            // Combine appointments and events for display
            const allItems: Array<{ type: 'appointment' | 'event'; data: any }> = [
              ...dayAppointments.map((apt) => ({ type: 'appointment' as const, data: apt })),
              ...dayEvents.map((evt) => ({ type: 'event' as const, data: evt })),
            ].sort((a, b) => {
              const dateA = a.type === 'appointment' ? (a.data.scheduledDate || '') : a.data.startDate;
              const dateB = b.type === 'appointment' ? (b.data.scheduledDate || '') : b.data.startDate;
              return new Date(dateA).getTime() - new Date(dateB).getTime();
            });

            // Mobile: compact view (apenas número + indicadores de cor)
            if (isMobile) {
              return (
                <div
                  key={index}
                  onClick={() => {
                    setSelectedDate(day);
                    setCurrentDate(day);
                    setViewMode('day');
                  }}
                  className={`min-h-[48px] p-1 border-b border-r border-gray-200 dark:border-gray-700 cursor-pointer transition-colors flex flex-col items-center ${
                    !isCurrentMonth ? 'bg-gray-50 dark:bg-gray-800/50' : ''
                  } ${
                    isSelected ? 'bg-purple-50 dark:bg-purple-900/20' : 'active:bg-gray-100 dark:active:bg-gray-800'
                  }`}
                >
                  <span
                    className={`text-xs font-medium mb-0.5 ${
                      !isCurrentMonth
                        ? 'text-gray-400 dark:text-gray-600'
                        : isToday
                        ? 'bg-purple-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px]'
                        : 'text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                  {/* Indicadores de pontinhos coloridos */}
                  {totalItems > 0 && (
                    <div className="flex flex-wrap gap-0.5 justify-center max-w-full">
                      {allItems.slice(0, 3).map((item, i) => {
                        let dotColor = '#8B5CF6';
                        if (item.type === 'appointment') {
                          const apt = item.data as Appointment;
                          dotColor = apt.procedure.color || '#3B82F6';
                        } else {
                          const evt = item.data as CalendarEvent;
                          dotColor = evt.tag?.color || '#8B5CF6';
                        }
                        return (
                          <div
                            key={i}
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: dotColor }}
                          />
                        );
                      })}
                      {totalItems > 3 && (
                        <span className="text-[8px] text-gray-400 leading-none">+{totalItems - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            }

            // Desktop: vista completa
            return (
              <div
                key={index}
                onClick={() => {
                  setSelectedDate(day);
                  handleDayClickForEvent(day);
                }}
                className={`group min-h-[100px] p-2 border-b border-r border-gray-200 dark:border-gray-700 cursor-pointer transition-colors ${
                  !isCurrentMonth ? 'bg-gray-50 dark:bg-gray-800/50' : ''
                } ${
                  isSelected ? 'bg-purple-50 dark:bg-purple-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                title="Clique para criar evento"
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
                    {totalItems > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {totalItems}
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

                {/* Lista de items do dia (agendamentos + eventos) */}
                <div className="space-y-1">
                  {allItems.slice(0, 3).map((item) => {
                    if (item.type === 'appointment') {
                      const apt = item.data as Appointment;
                      return (
                        <div
                          key={`apt-${apt.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditAppointment(apt);
                          }}
                          style={getProcedureColorStyle(apt.procedure.color)}
                          className={`text-xs p-1 rounded truncate ${!apt.procedure.color ? statusColors[apt.status] : ''} ${!apt.procedure.color && apt.appointmentType ? appointmentTypeColors[apt.appointmentType] : ''} cursor-pointer hover:opacity-80`}
                        >
                          {apt.scheduledDate && format(parseISO(apt.scheduledDate), 'HH:mm')} - {apt.sale.patient.name}
                        </div>
                      );
                    } else {
                      const evt = item.data as CalendarEvent;
                      const tagColor = evt.tag?.color || '#8B5CF6';
                      return (
                        <div
                          key={`evt-${evt.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditCalendarEvent(evt);
                          }}
                          className="text-xs p-1 rounded truncate cursor-pointer hover:opacity-80"
                          style={{
                            backgroundColor: `${tagColor}20`,
                            borderLeft: `3px solid ${tagColor}`,
                            color: tagColor,
                          }}
                          title={evt.description || evt.title}
                        >
                          {format(parseISO(evt.startDate), 'HH:mm')} {evt.title}
                        </div>
                      );
                    }
                  })}
                  {allItems.length > 3 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 pl-1">
                      +{allItems.length - 3} mais
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

    // Mobile: lista vertical dos dias da semana
    if (isMobile) {
      return (
        <div className="space-y-3">
          {days.map((day) => {
            const dayAppointments = getAppointmentsForDay(day);
            const dayEvents = getCalendarEventsForDay(day);
            const isToday = isSameDay(day, new Date());
            const totalItems = dayAppointments.length + dayEvents.length;

            return (
              <Card key={day.toISOString()} className={isToday ? 'border-purple-300 dark:border-purple-600' : ''}>
                <div
                  className={`px-4 py-2 flex items-center justify-between border-b ${
                    isToday ? 'bg-purple-50 dark:bg-purple-900/20' : 'bg-gray-50 dark:bg-gray-800'
                  }`}
                  onClick={() => {
                    setCurrentDate(day);
                    setViewMode('day');
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${isToday ? 'text-purple-600' : 'text-gray-700 dark:text-gray-300'}`}>
                      {format(day, 'EEE', { locale: ptBR })}
                    </span>
                    <span className={`text-lg font-bold ${isToday ? 'text-purple-600' : 'text-gray-900 dark:text-gray-100'}`}>
                      {format(day, 'd')}
                    </span>
                  </div>
                  {totalItems > 0 && (
                    <Badge variant="secondary" className="text-xs">{totalItems}</Badge>
                  )}
                </div>
                {totalItems > 0 && (
                  <div className="p-3 space-y-2">
                    {dayAppointments.map((apt) => (
                      <div
                        key={apt.id}
                        onClick={() => handleEditAppointment(apt)}
                        style={getProcedureColorStyle(apt.procedure.color)}
                        className={`p-2 rounded-lg cursor-pointer active:opacity-80 ${!apt.procedure.color ? statusColors[apt.status] : ''} ${!apt.procedure.color && apt.appointmentType ? appointmentTypeColors[apt.appointmentType] : ''}`}
                      >
                        <div className="font-medium text-sm">
                          {apt.scheduledDate && format(parseISO(apt.scheduledDate), 'HH:mm')} — {apt.sale.patient.name}
                        </div>
                        <div className="text-xs mt-0.5 opacity-75">{apt.procedure.name}</div>
                      </div>
                    ))}
                    {dayEvents.map((evt) => {
                      const tagColor = evt.tag?.color || '#8B5CF6';
                      return (
                        <div
                          key={evt.id}
                          onClick={() => handleEditCalendarEvent(evt)}
                          className="p-2 rounded-lg cursor-pointer active:opacity-80"
                          style={{
                            backgroundColor: `${tagColor}20`,
                            borderLeft: `3px solid ${tagColor}`,
                          }}
                        >
                          <div className="font-medium text-sm" style={{ color: tagColor }}>
                            {format(parseISO(evt.startDate), 'HH:mm')} — {evt.title}
                          </div>
                          {evt.tag && (
                            <div className="text-xs mt-0.5 opacity-75 flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tagColor }} />
                              {evt.tag.name}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      );
    }

    // Desktop: grid padrão
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700">
          {days.map((day) => {
            const dayAppointments = getAppointmentsForDay(day);
            const dayEvents = getCalendarEventsForDay(day);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={day.toISOString()}
                className="bg-white dark:bg-gray-900 min-h-[400px] cursor-pointer"
                onClick={() => handleDayClickForEvent(day)}
              >
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
                      onClick={(e) => { e.stopPropagation(); handleEditAppointment(apt); }}
                      className={`p-2 rounded-lg cursor-pointer hover:opacity-80 ${statusColors[apt.status]} ${apt.appointmentType ? appointmentTypeColors[apt.appointmentType] : ''}`}
                    >
                      <div className="font-medium text-sm">
                        {apt.scheduledDate && format(parseISO(apt.scheduledDate), 'HH:mm')}
                      </div>
                      <div className="text-xs mt-1">{apt.sale.patient.name}</div>
                      <div className="text-xs mt-1 opacity-75">{apt.procedure.name}</div>
                    </div>
                  ))}
                  {dayEvents.map((evt) => {
                    const tagColor = evt.tag?.color || '#8B5CF6';
                    return (
                      <div
                        key={evt.id}
                        onClick={(e) => { e.stopPropagation(); handleEditCalendarEvent(evt); }}
                        className="p-2 rounded-lg cursor-pointer hover:opacity-80"
                        style={{
                          backgroundColor: `${tagColor}20`,
                          borderLeft: `3px solid ${tagColor}`,
                        }}
                      >
                        <div className="font-medium text-sm" style={{ color: tagColor }}>
                          {format(parseISO(evt.startDate), 'HH:mm')}
                        </div>
                        <div className="text-xs mt-1 font-medium" style={{ color: tagColor }}>
                          {evt.title}
                        </div>
                        {evt.tag && (
                          <div className="text-xs mt-1 opacity-75 flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tagColor }} />
                            {evt.tag.name}
                          </div>
                        )}
                      </div>
                    );
                  })}
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
    const dayEvents = getCalendarEventsForDay(currentDate);

    return (
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg">Agendamentos do Dia</CardTitle>
              <CardDescription className="text-xs sm:text-sm truncate">
                {format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </CardDescription>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <Button
                onClick={() => handleDayClickForEvent(currentDate)}
                variant="outline"
                size="sm"
                className="text-purple-600 text-xs sm:text-sm h-8"
              >
                <Plus className="h-3.5 w-3.5 sm:mr-1" />
                <span className="hidden sm:inline">Evento</span>
              </Button>
              <Button
                onClick={() => handleSlotClick(currentDate, '09:00')}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-xs sm:text-sm h-8"
              >
                <Plus className="h-3.5 w-3.5 sm:mr-1" />
                <span className="hidden sm:inline">Agendar</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          {dayAppointments.length === 0 && dayEvents.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <CalendarIcon className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum agendamento ou evento para este dia</p>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {/* Calendar Events */}
              {dayEvents.map((evt) => {
                const tagColor = evt.tag?.color || '#8B5CF6';
                return (
                  <div
                    key={`evt-${evt.id}`}
                    onClick={() => handleEditCalendarEvent(evt)}
                    className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border cursor-pointer transition-colors active:opacity-90 hover:opacity-90"
                    style={{
                      borderColor: `${tagColor}40`,
                      backgroundColor: `${tagColor}10`,
                      borderLeftWidth: '4px',
                      borderLeftColor: tagColor,
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Clock className="h-3.5 w-3.5 shrink-0" style={{ color: tagColor }} />
                        <span className="font-medium text-sm" style={{ color: tagColor }}>
                          {format(parseISO(evt.startDate), 'HH:mm')} - {format(parseISO(evt.endDate), 'HH:mm')}
                        </span>
                      </div>
                      <div className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">
                        {evt.title}
                      </div>
                      {evt.description && (
                        <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                          {evt.description}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      {evt.tag && (
                        <Badge
                          className="text-white text-xs"
                          style={{ backgroundColor: tagColor }}
                        >
                          {evt.tag.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Procedure Appointments */}
              {dayAppointments.map((apt) => (
                <div
                  key={`apt-${apt.id}`}
                  onClick={() => handleEditAppointment(apt)}
                  style={getProcedureColorStyle(apt.procedure.color)}
                  className={`flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-700 active:border-purple-300 hover:border-purple-300 dark:hover:border-purple-600 cursor-pointer transition-colors ${!apt.procedure.color && apt.appointmentType ? appointmentTypeColors[apt.appointmentType] : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Clock className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400 shrink-0" />
                      <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                        {apt.scheduledDate && format(parseISO(apt.scheduledDate), 'HH:mm')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <User className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400 shrink-0" />
                      <span className="text-sm text-gray-900 dark:text-gray-100 truncate">{apt.sale.patient.name}</span>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      {apt.procedure.name}
                    </div>
                    {apt.notes && (
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                        {apt.notes}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <Badge className={`text-xs ${statusColors[apt.status]}`}>
                      {statusLabels[apt.status]}
                    </Badge>
                    {apt.appointmentType && (
                      <Badge className={`text-xs ${appointmentTypeBadgeColors[apt.appointmentType]}`}>
                        {isMobile
                          ? appointmentTypeLabels[apt.appointmentType].split(' ').slice(0, 2).join(' ')
                          : appointmentTypeLabels[apt.appointmentType]}
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
    <div className="space-y-4 sm:space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">
            Agenda
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Gerencie seus agendamentos e eventos
          </p>
          {googleCalendarEnabled && (
            <button
              onClick={() => syncGoogleCalendar(true)}
              disabled={isSyncing}
              className="flex items-center gap-1.5 mt-1 group cursor-pointer disabled:cursor-wait"
              title="Sincronizar Google Calendar"
            >
              <RefreshCw className={`h-3 w-3 text-gray-400 group-hover:text-purple-500 transition-colors ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="text-xs text-gray-400 group-hover:text-purple-500 transition-colors">
                {isSyncing
                  ? 'Sincronizando...'
                  : lastGoogleSync
                  ? `Google sync ${formatSyncTime(lastGoogleSync)}`
                  : 'Sincronizar Google Calendar'}
              </span>
            </button>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {!isMobile && (
            <Link href="/agenda/futuros">
              <Button variant="outline" size={isMobile ? 'sm' : 'default'}>
                <ListFilter className="h-4 w-4 mr-2" />
                Ver Futuros
              </Button>
            </Link>
          )}
          <Button
            onClick={() => setIsTagManagerOpen(true)}
            variant="outline"
            size={isMobile ? 'sm' : 'default'}
            className="border-purple-200 text-purple-600 hover:bg-purple-50"
          >
            <TagIcon className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Tags</span>
          </Button>
          {!isMobile && (
            <Button
              onClick={() => handleDayClickForEvent(new Date())}
              variant="outline"
              className="border-purple-200 text-purple-600 hover:bg-purple-50"
            >
              <CalendarPlus className="h-4 w-4 mr-2" />
              Novo Evento
            </Button>
          )}
          <Button 
            onClick={() => handleSlotClick(new Date())} 
            size={isMobile ? 'sm' : 'default'}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Novo Agendamento</span>
            <span className="sm:hidden">Agendar</span>
          </Button>
        </div>
      </div>

      {/* Controles do Calendário */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col gap-3">
            {/* Linha 1: Navegação + período */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 sm:gap-2">
                <Button onClick={handlePrevious} variant="outline" size="sm" className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button onClick={handleToday} variant="outline" size="sm" className="h-8 text-xs sm:text-sm sm:h-9">
                  Hoje
                </Button>
                <Button onClick={handleNext} variant="outline" size="sm" className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-sm sm:text-lg font-semibold text-gray-900 dark:text-gray-100 text-right truncate">
                {viewMode === 'month' && format(currentDate, isMobile ? "MMM yyyy" : "MMMM 'de' yyyy", { locale: ptBR })}
                {viewMode === 'week' && (
                  `${format(startOfWeek(currentDate, { locale: ptBR }), 'd MMM', { locale: ptBR })} - ${format(endOfWeek(currentDate, { locale: ptBR }), isMobile ? 'd MMM' : 'd MMM yyyy', { locale: ptBR })}`
                )}
                {viewMode === 'day' && format(currentDate, isMobile ? "d 'de' MMM" : "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </div>
            </div>

            {/* Linha 2: Seletor de view + Filtro de tags */}
            <div className="flex items-center justify-between gap-2">
              {/* Seletor de visualização */}
              <div className="flex gap-1 sm:gap-2">
                <Button
                  onClick={() => setViewMode('month')}
                  variant={viewMode === 'month' ? 'default' : 'outline'}
                  size="sm"
                  className={`h-8 text-xs sm:text-sm ${viewMode === 'month' ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                >
                  Mês
                </Button>
                <Button
                  onClick={() => setViewMode('week')}
                  variant={viewMode === 'week' ? 'default' : 'outline'}
                  size="sm"
                  className={`h-8 text-xs sm:text-sm ${viewMode === 'week' ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                >
                  Semana
                </Button>
                <Button
                  onClick={() => setViewMode('day')}
                  variant={viewMode === 'day' ? 'default' : 'outline'}
                  size="sm"
                  className={`h-8 text-xs sm:text-sm ${viewMode === 'day' ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                >
                  Dia
                </Button>
              </div>

              {/* Filtro de Tags */}
              {tags.length > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`h-8 text-xs sm:text-sm gap-1.5 ${
                        activeFilterCount < totalFilterCount
                          ? 'border-purple-300 bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-700'
                          : ''
                      }`}
                    >
                      <Filter className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Filtrar Tags</span>
                      <span className="sm:hidden">Tags</span>
                      {activeFilterCount < totalFilterCount && (
                        <Badge variant="secondary" className="h-4 px-1 text-[10px] ml-0.5">
                          {activeFilterCount}/{totalFilterCount}
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3" align="end">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                          Filtrar por Tags
                        </h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={toggleAllTags}
                          className="h-7 text-xs text-purple-600 hover:text-purple-700"
                        >
                          {selectedTagIds.size === tags.length && showNoTag ? (
                            <><EyeOff className="h-3 w-3 mr-1" /> Ocultar todas</>
                          ) : (
                            <><Eye className="h-3 w-3 mr-1" /> Mostrar todas</>
                          )}
                        </Button>
                      </div>

                      <div className="space-y-1.5">
                        {/* Sem tag */}
                        <label className="flex items-center gap-2.5 p-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
                          <Checkbox
                            checked={showNoTag}
                            onCheckedChange={() => setShowNoTag(!showNoTag)}
                            className="border-gray-400 data-[state=checked]:bg-gray-500 data-[state=checked]:border-gray-500"
                          />
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-gray-400 border border-gray-300" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Sem tag</span>
                          </div>
                        </label>

                        {/* Tags */}
                        {tags.map((tag) => (
                          <label
                            key={tag.id}
                            className="flex items-center gap-2.5 p-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                          >
                            <Checkbox
                              checked={selectedTagIds.has(tag.id)}
                              onCheckedChange={() => toggleTagFilter(tag.id)}
                              style={{
                                borderColor: tag.color,
                                backgroundColor: selectedTagIds.has(tag.id) ? tag.color : 'transparent',
                              }}
                            />
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: tag.color }}
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                                {tag.name}
                              </span>
                            </div>
                            {tag._count && (
                              <span className="text-xs text-gray-400 shrink-0">{tag._count.events}</span>
                            )}
                          </label>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
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

      {/* Modal de Evento do Calendário */}
      <CalendarEventModal
        isOpen={isEventModalOpen}
        onClose={() => {
          setIsEventModalOpen(false);
          setEditingEvent(null);
        }}
        onSuccess={handleEventSuccess}
        preselectedDate={eventModalDate}
        preselectedEndDate={eventModalEndDate}
        preselectedTime={eventModalTime}
        editingEvent={editingEvent}
      />

      {/* Gerenciador de Tags */}
      <TagManager
        isOpen={isTagManagerOpen}
        onClose={() => setIsTagManagerOpen(false)}
        onTagsChanged={() => {
          setRefreshKey((k) => k + 1);
        }}
      />
    </div>
  );
}
