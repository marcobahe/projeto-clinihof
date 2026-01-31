'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Loader2, Calendar, Globe } from 'lucide-react';
import { format } from 'date-fns';

type PatientOrigin = 'INSTAGRAM' | 'INDICACAO' | 'GOOGLE' | 'WHATSAPP' | 'FACEBOOK' | 'SITE' | 'OUTROS';

const originOptions: { value: PatientOrigin; label: string }[] = [
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'INDICACAO', label: 'Indicação' },
  { value: 'GOOGLE', label: 'Google' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'SITE', label: 'Site' },
  { value: 'OUTROS', label: 'Outros' },
];

interface Patient {
  id: string;
  name: string;
  email?: string | null;
  phone: string;
  birthday?: string | null;
  origin?: PatientOrigin | null;
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
    birthday: patient?.birthday ? format(new Date(patient.birthday), 'yyyy-MM-dd') : '',
    origin: patient?.origin ?? '',
    notes: patient?.notes ?? '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const url = patient ? `/api/patients/${patient.id}` : '/api/patients';
      const method = patient ? 'PUT' : 'POST';

      const submitData = {
        ...formData,
        birthday: formData.birthday || null,
        origin: formData.origin || null,
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="birthday" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Data de Nascimento
          </Label>
          <Input
            id="birthday"
            type="date"
            value={formData.birthday}
            onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="origin" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Como nos conheceu?
          </Label>
          <Select
            value={formData.origin}
            onValueChange={(value) => setFormData({ ...formData, origin: value })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Selecione a origem" />
            </SelectTrigger>
            <SelectContent>
              {originOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
