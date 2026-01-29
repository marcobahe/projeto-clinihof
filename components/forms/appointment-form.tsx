'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface Patient {
  id: string;
  name: string;
}

interface Procedure {
  id: string;
  name: string;
}

interface Appointment {
  id: string;
  dateTime: string;
  status: string;
  notes?: string | null;
  patient: {
    id: string;
  };
  procedures: Array<{
    procedure: {
      id: string;
    };
  }>;
}

interface AppointmentFormProps {
  appointment?: Appointment | null;
  onSuccess: () => void;
}

export function AppointmentForm({ appointment, onSuccess }: AppointmentFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [formData, setFormData] = useState({
    patientId: appointment?.patient?.id ?? '',
    dateTime: appointment?.dateTime
      ? new Date(appointment.dateTime).toISOString().slice(0, 16)
      : '',
    status: appointment?.status ?? 'SCHEDULED',
    notes: appointment?.notes ?? '',
    procedureIds:
      appointment?.procedures?.map((ap) => ap?.procedure?.id)?.filter(Boolean) ?? [],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [patientsRes, proceduresRes] = await Promise.all([
          fetch('/api/patients'),
          fetch('/api/procedures'),
        ]);

        if (patientsRes.ok) {
          const patientsData = await patientsRes.json();
          setPatients(patientsData);
        }

        if (proceduresRes.ok) {
          const proceduresData = await proceduresRes.json();
          setProcedures(proceduresData);
        }
      } catch (error) {
        toast({
          title: 'Erro',
          description: 'Erro ao carregar dados',
          variant: 'destructive',
        });
      }
    };

    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.procedureIds.length === 0) {
      toast({
        title: 'Erro',
        description: 'Selecione pelo menos um procedimento',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const url = appointment ? `/api/appointments/${appointment.id}` : '/api/appointments';
      const method = appointment ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error();
      }

      toast({
        title: 'Sucesso',
        description: appointment
          ? 'Atendimento atualizado com sucesso'
          : 'Atendimento cadastrado com sucesso',
      });

      onSuccess();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar atendimento',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleProcedure = (procedureId: string) => {
    setFormData((prev) => ({
      ...prev,
      procedureIds: prev.procedureIds.includes(procedureId)
        ? prev.procedureIds.filter((id) => id !== procedureId)
        : [...prev.procedureIds, procedureId],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="patientId">Paciente *</Label>
        <Select
          value={formData.patientId}
          onValueChange={(value) => setFormData({ ...formData, patientId: value })}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione um paciente" />
          </SelectTrigger>
          <SelectContent>
            {patients.map((patient) => (
              <SelectItem key={patient?.id} value={patient?.id ?? ''}>
                {patient?.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="dateTime">Data e Hora *</Label>
        <Input
          id="dateTime"
          type="datetime-local"
          value={formData.dateTime}
          onChange={(e) => setFormData({ ...formData, dateTime: e.target.value })}
          required
        />
      </div>

      <div>
        <Label htmlFor="status">Status *</Label>
        <Select
          value={formData.status}
          onValueChange={(value) => setFormData({ ...formData, status: value })}
          required
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SCHEDULED">Agendado</SelectItem>
            <SelectItem value="CONFIRMED">Confirmado</SelectItem>
            <SelectItem value="COMPLETED">Concluído</SelectItem>
            <SelectItem value="CANCELLED">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Procedimentos *</Label>
        <div className="border rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto">
          {procedures.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum procedimento cadastrado</p>
          ) : (
            procedures.map((procedure) => (
              <div key={procedure?.id} className="flex items-center space-x-2">
                <Checkbox
                  id={procedure?.id}
                  checked={formData.procedureIds.includes(procedure?.id ?? '')}
                  onCheckedChange={() => toggleProcedure(procedure?.id ?? '')}
                />
                <label
                  htmlFor={procedure?.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {procedure?.name}
                </label>
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Observações</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Informações adicionais sobre o atendimento"
          rows={3}
        />
      </div>

      <Button
        type="submit"
        className="w-full bg-purple-600 hover:bg-purple-700"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Salvando...
          </>
        ) : (
          'Salvar'
        )}
      </Button>
    </form>
  );
}
