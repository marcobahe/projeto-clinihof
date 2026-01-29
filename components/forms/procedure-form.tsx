'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Procedure {
  id: string;
  name: string;
  price: number;
  duration: number;
}

interface ProcedureFormProps {
  procedure?: Procedure | null;
  onSuccess: () => void;
}

export function ProcedureForm({ procedure, onSuccess }: ProcedureFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: procedure?.name ?? '',
    price: procedure?.price?.toString() ?? '',
    duration: procedure?.duration?.toString() ?? '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const url = procedure ? `/api/procedures/${procedure.id}` : '/api/procedures';
      const method = procedure ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          price: parseFloat(formData.price),
          duration: parseInt(formData.duration),
        }),
      });

      if (!response.ok) {
        throw new Error();
      }

      toast({
        title: 'Sucesso',
        description: procedure
          ? 'Procedimento atualizado com sucesso'
          : 'Procedimento cadastrado com sucesso',
      });

      onSuccess();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar procedimento',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Nome do Procedimento *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          placeholder="Ex: Limpeza de Pele"
        />
      </div>

      <div>
        <Label htmlFor="price">Preço (R$) *</Label>
        <Input
          id="price"
          type="number"
          step="0.01"
          min="0"
          value={formData.price}
          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
          required
          placeholder="0.00"
        />
      </div>

      <div>
        <Label htmlFor="duration">Duração (minutos) *</Label>
        <Input
          id="duration"
          type="number"
          min="1"
          value={formData.duration}
          onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
          required
          placeholder="60"
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
