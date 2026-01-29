'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Patient {
  id: string;
  name: string;
  email?: string | null;
  phone: string;
  notes?: string | null;
}

interface PatientFormProps {
  patient?: Patient | null;
  onSuccess: () => void;
}

export function PatientForm({ patient, onSuccess }: PatientFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: patient?.name ?? '',
    email: patient?.email ?? '',
    phone: patient?.phone ?? '',
    notes: patient?.notes ?? '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const url = patient ? `/api/patients/${patient.id}` : '/api/patients';
      const method = patient ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao salvar paciente');
      }

      toast({
        title: 'Sucesso',
        description: patient
          ? 'Paciente atualizado com sucesso'
          : 'Paciente cadastrado com sucesso',
      });

      onSuccess();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao salvar paciente';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Nome *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          placeholder="Nome completo do paciente"
        />
      </div>

      <div>
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="email@exemplo.com"
        />
      </div>

      <div>
        <Label htmlFor="phone">Telefone/WhatsApp *</Label>
        <Input
          id="phone"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          required
          placeholder="(00) 00000-0000"
        />
      </div>

      <div>
        <Label htmlFor="notes">Observações</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Informações adicionais sobre o paciente"
          rows={4}
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
