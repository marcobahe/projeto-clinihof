'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Loader2, Palette, DollarSign } from 'lucide-react';

interface Procedure {
  id: string;
  name: string;
  price: number;
  duration: number;
  fixedCost?: number | null;
  color?: string | null;
}

interface ProcedureFormProps {
  procedure?: Procedure | null;
  onSuccess: () => void;
}

const PRESET_COLORS = [
  '#9333ea', // Purple
  '#3b82f6', // Blue
  '#22c55e', // Green
  '#eab308', // Yellow
  '#f97316', // Orange
  '#ef4444', // Red
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
];

export function ProcedureForm({ procedure, onSuccess }: ProcedureFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: procedure?.name ?? '',
    price: procedure?.price?.toString() ?? '',
    duration: procedure?.duration?.toString() ?? '',
    fixedCost: procedure?.fixedCost?.toString() ?? '0',
    color: procedure?.color ?? '',
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
          fixedCost: parseFloat(formData.fixedCost) || 0,
          color: formData.color || null,
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

      <div>
        <Label htmlFor="fixedCost" className="flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Custo Fixo (R$)
        </Label>
        <Input
          id="fixedCost"
          type="number"
          step="0.01"
          min="0"
          value={formData.fixedCost}
          onChange={(e) => setFormData({ ...formData, fixedCost: e.target.value })}
          placeholder="0.00"
        />
        <p className="text-xs text-gray-500 mt-1">
          Custo fixo base do procedimento (equipamentos, produtos exclusivos, etc.)
        </p>
      </div>

      <div>
        <Label className="flex items-center gap-2 mb-2">
          <Palette className="h-4 w-4" />
          Cor no Calendário
        </Label>
        <p className="text-xs text-gray-500 mb-2">
          Selecione uma cor para identificar este procedimento na agenda
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, color: '' })}
            className={`w-8 h-8 rounded-full border-2 ${!formData.color ? 'border-purple-600 ring-2 ring-purple-200' : 'border-gray-200'} bg-gray-100 flex items-center justify-center text-xs text-gray-500`}
            title="Sem cor"
          >
            ∅
          </button>
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setFormData({ ...formData, color })}
              className={`w-8 h-8 rounded-full border-2 ${formData.color === color ? 'border-purple-600 ring-2 ring-purple-200' : 'border-gray-200'}`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
        {formData.color && (
          <div className="mt-2 flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: formData.color }}
            />
            <span className="text-sm text-gray-600">{formData.color}</span>
          </div>
        )}
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
