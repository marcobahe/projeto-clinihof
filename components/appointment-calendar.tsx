'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Appointment {
  id: string;
  dateTime: string;
  status: string;
  patient: {
    name: string;
  };
  procedures: Array<{
    procedure: {
      name: string;
    };
  }>;
}

interface AppointmentCalendarProps {
  appointments: Appointment[];
}

export function AppointmentCalendar({ appointments }: AppointmentCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startingDayOfWeek = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const getAppointmentsForDay = (day: number) => {
    const dayDate = new Date(year, month, day);
    return appointments.filter((apt) => {
      const aptDate = new Date(apt?.dateTime ?? '');
      return (
        aptDate.getDate() === day &&
        aptDate.getMonth() === month &&
        aptDate.getFullYear() === year
      );
    });
  };

  const statusColors: Record<string, string> = {
    SCHEDULED: 'bg-blue-500',
    CONFIRMED: 'bg-purple-500',
    COMPLETED: 'bg-green-500',
    CANCELLED: 'bg-red-500',
  };

  const days = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(<div key={`empty-${i}`} className="h-24" />);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dayAppointments = getAppointmentsForDay(day);
    const isToday =
      day === new Date().getDate() &&
      month === new Date().getMonth() &&
      year === new Date().getFullYear();

    days.push(
      <div
        key={day}
        className={`h-24 border p-2 overflow-y-auto ${
          isToday ? 'bg-purple-50 border-purple-300' : 'bg-white'
        }`}
      >
        <div className={`text-sm font-semibold mb-1 ${isToday ? 'text-purple-700' : ''}`}>
          {day}
        </div>
        <div className="space-y-1">
          {dayAppointments.map((apt) => (
            <div
              key={apt?.id}
              className={`text-xs p-1 rounded text-white truncate ${
                statusColors[apt?.status ?? ''] ?? 'bg-gray-500'
              }`}
              title={`${apt?.patient?.name} - ${
                apt?.procedures?.map((p) => p?.procedure?.name)?.join(', ') ?? ''
              }`}
            >
              {new Date(apt?.dateTime ?? '').toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              {apt?.patient?.name}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const monthNames = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            {monthNames[month]} {year}
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={previousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
            >
              Hoje
            </Button>
            <Button variant="outline" size="sm" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {weekDays.map((day) => (
            <div
              key={day}
              className="bg-gray-50 p-2 text-center text-sm font-semibold text-gray-700"
            >
              {day}
            </div>
          ))}
          {days}
        </div>
        <div className="mt-4 flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded" />
            Agendado
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded" />
            Confirmado
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded" />
            Concluído
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded" />
            Cancelado
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
