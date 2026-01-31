'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, User, Stethoscope, Clock, UserCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { AppointmentType } from '@prisma/client';

interface Patient {
  id: string;
  name: string;
  phone: string;
}

interface Procedure {
  id: string;
  name: string;
  price: number;
  duration: number;
  color?: string | null;
}

interface Collaborator {
  id: string;
  name: string;
  role: string;
}

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedDate?: Date;
  preselectedTime?: string;
}

const appointmentTypeLabels = {
  FIRST_VISIT: '🔴 Primeira Consulta',
  PAYMENT_PENDING: '🟡 Pendência Financeira',
  FOLLOW_UP: '🟢 Retorno/Acompanhamento',
};

export function AppointmentModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedDate,
  preselectedTime,
}: AppointmentModalProps) {
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);

  // Form states
  const [patientId, setPatientId] = useState<string>('');
  const [procedureId, setProcedureId] = useState<string>('');
  const [collaboratorId, setCollaboratorId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(preselectedDate || new Date());
  const [selectedTime, setSelectedTime] = useState<string>(preselectedTime || '09:00');
  const [appointmentType, setAppointmentType] = useState<AppointmentType | 'none'>('none');
  const [notes, setNotes] = useState<string>('');
  const [createSale, setCreateSale] = useState<boolean>(false);

  // Load patients, procedures, and collaborators
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [patientsRes, proceduresRes, collaboratorsRes] = await Promise.all([
          fetch('/api/patients'),
          fetch('/api/procedures'),
          fetch('/api/collaborators'),
        ]);

        if (patientsRes.ok) {
          const data = await patientsRes.json();
          setPatients(data);
        }
        if (proceduresRes.ok) {
          const data = await proceduresRes.json();
          setProcedures(data);
        }
        if (collaboratorsRes.ok) {
          const data = await collaboratorsRes.json();
          setCollaborators(data);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  // Update date/time when props change
  useEffect(() => {
    if (preselectedDate) {
      setSelectedDate(preselectedDate);
    }
    if (preselectedTime) {
      setSelectedTime(preselectedTime);
    }
  }, [preselectedDate, preselectedTime]);

  // Reset form when closing
  const handleClose = () => {
    setPatientId('');
    setProcedureId('');
    setCollaboratorId('');
    setSelectedDate(new Date());
    setSelectedTime('09:00');
    setAppointmentType('none');
    setNotes('');
    setCreateSale(false);
    onClose();
  };

  // Submit form
  const handleSubmit = async () => {
    if (!patientId || !procedureId) {
      toast.error('Selecione um paciente e um procedimento');
      return;
    }

    // Combine date and time
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const scheduledDate = new Date(selectedDate);
    scheduledDate.setHours(hours, minutes, 0, 0);

    setLoading(true);

    try {
      const response = await fetch('/api/agenda/criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          procedureId,
          collaboratorId: collaboratorId || null,
          scheduledDate: scheduledDate.toISOString(),
          appointmentType: appointmentType === 'none' ? null : appointmentType,
          notes: notes || null,
          createSale,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar agendamento');
      }

      toast.success(data.message || 'Agendamento criado com sucesso!');
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Error creating appointment:', error);
      toast.error(error.message || 'Erro ao criar agendamento');
    } finally {
      setLoading(false);
    }
  };

  // Generate time slots
  const timeSlots = [];
  for (let hour = 7; hour <= 21; hour++) {
    for (let minute of [0, 30]) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeSlots.push(time);
    }
  }

  // Get selected procedure details
  const selectedProcedure = procedures.find(p => p.id === procedureId);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-purple-600" />
            Novo Agendamento
          </DialogTitle>
          <DialogDescription>
            Preencha os dados para criar um novo agendamento no calendário
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Patient Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Paciente *
            </Label>
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o paciente" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((patient) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    <div className="flex flex-col">
                      <span>{patient.name}</span>
                      <span className="text-xs text-gray-500">{patient.phone}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Procedure Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4" />
              Procedimento *
            </Label>
            <Select value={procedureId} onValueChange={setProcedureId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o procedimento" />
              </SelectTrigger>
              <SelectContent>
                {procedures.map((procedure) => (
                  <SelectItem key={procedure.id} value={procedure.id}>
                    <div className="flex items-center gap-2">
                      {procedure.color && (
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: procedure.color }}
                        />
                      )}
                      <span>{procedure.name}</span>
                      <span className="text-xs text-gray-500">({procedure.duration} min)</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedProcedure && (
              <div className="text-sm text-gray-500">
                Valor: R$ {selectedProcedure.price.toFixed(2)} | Duração: {selectedProcedure.duration} min
              </div>
            )}
          </div>

          {/* Collaborator Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Profissional (opcional)
            </Label>
            <Select value={collaboratorId} onValueChange={setCollaboratorId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o profissional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Não especificado</SelectItem>
                {collaborators.map((collab) => (
                  <SelectItem key={collab.id} value={collab.id}>
                    <div className="flex flex-col">
                      <span>{collab.name}</span>
                      <span className="text-xs text-gray-500">{collab.role}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date and Time Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Data *
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Horário *
              </Label>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Appointment Type */}
          <div className="space-y-2">
            <Label>Tipo de Consulta</Label>
            <Select 
              value={appointmentType} 
              onValueChange={(value) => setAppointmentType(value as AppointmentType | 'none')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Não classificado</SelectItem>
                <SelectItem value="FIRST_VISIT">{appointmentTypeLabels.FIRST_VISIT}</SelectItem>
                <SelectItem value="PAYMENT_PENDING">{appointmentTypeLabels.PAYMENT_PENDING}</SelectItem>
                <SelectItem value="FOLLOW_UP">{appointmentTypeLabels.FOLLOW_UP}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações sobre o agendamento..."
              rows={3}
            />
          </div>

          {/* Create Sale Option */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div>
              <Label className="font-medium">Criar nova venda</Label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Cria uma venda avulsa para este procedimento
              </p>
            </div>
            <Switch checked={createSale} onCheckedChange={setCreateSale} />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={loading || !patientId || !procedureId}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {loading ? 'Criando...' : 'Criar Agendamento'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
