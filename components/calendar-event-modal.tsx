'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, Clock, Tag as TagIcon, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  tagId?: string | null;
  tag?: Tag | null;
}

interface CalendarEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedDate?: Date;
  preselectedEndDate?: Date;
  preselectedTime?: string;
  editingEvent?: CalendarEvent | null;
}

export function CalendarEventModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedDate,
  preselectedEndDate,
  preselectedTime,
  editingEvent,
}: CalendarEventModalProps) {
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [tagId, setTagId] = useState<string>('none');

  // Fetch tags
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await fetch('/api/tags');
        if (response.ok) {
          const data = await response.json();
          setTags(data);
        }
      } catch (error) {
        console.error('Error fetching tags:', error);
      }
    };

    if (isOpen) {
      fetchTags();
    }
  }, [isOpen]);

  // Initialize form with preselected/editing values
  useEffect(() => {
    if (editingEvent) {
      setTitle(editingEvent.title);
      setDescription(editingEvent.description || '');
      const start = new Date(editingEvent.startDate);
      const end = new Date(editingEvent.endDate);
      setStartDate(start);
      setEndDate(end);
      setStartTime(format(start, 'HH:mm'));
      setEndTime(format(end, 'HH:mm'));
      setTagId(editingEvent.tagId || 'none');
    } else {
      setTitle('');
      setDescription('');
      if (preselectedDate) {
        setStartDate(preselectedDate);
        setEndDate(preselectedEndDate || preselectedDate);
      } else {
        setStartDate(new Date());
        setEndDate(new Date());
      }
      if (preselectedTime) {
        setStartTime(preselectedTime);
        // Auto set end time 1 hour later
        const [h, m] = preselectedTime.split(':').map(Number);
        const endH = Math.min(h + 1, 23);
        setEndTime(`${endH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      } else {
        setStartTime('09:00');
        setEndTime('10:00');
      }
      setTagId('none');
    }
  }, [editingEvent, preselectedDate, preselectedEndDate, preselectedTime, isOpen]);

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setStartTime('09:00');
    setEndTime('10:00');
    setTagId('none');
    onClose();
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    // Combine date and time
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    const startDateTime = new Date(startDate);
    startDateTime.setHours(startH, startM, 0, 0);

    const endDateTime = new Date(endDate);
    endDateTime.setHours(endH, endM, 0, 0);

    if (endDateTime <= startDateTime) {
      toast.error('A data/hora de fim deve ser posterior ao início');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        startDate: startDateTime.toISOString(),
        endDate: endDateTime.toISOString(),
        tagId: tagId === 'none' ? null : tagId,
      };

      let response: Response;

      if (editingEvent) {
        response = await fetch(`/api/calendar-events/${editingEvent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch('/api/calendar-events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao salvar evento');
      }

      toast.success(editingEvent ? 'Evento atualizado!' : 'Evento criado!');
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Error saving event:', error);
      toast.error(error.message || 'Erro ao salvar evento');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editingEvent) return;
    if (!confirm('Deseja realmente excluir este evento?')) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/calendar-events/${editingEvent.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao excluir evento');
      }

      toast.success('Evento excluído!');
      onSuccess();
      handleClose();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir evento');
    } finally {
      setLoading(false);
    }
  };

  // Generate time slots
  const timeSlots = [];
  for (let hour = 6; hour <= 22; hour++) {
    for (const minute of [0, 15, 30, 45]) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeSlots.push(time);
    }
  }

  // Get selected tag
  const selectedTag = tags.find((t) => t.id === tagId);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-purple-600" />
            {editingEvent ? 'Editar Evento' : 'Novo Evento'}
          </DialogTitle>
          <DialogDescription>
            {editingEvent
              ? 'Altere os dados do evento no calendário'
              : 'Crie um novo evento personalizado no calendário'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Título */}
          <div className="space-y-2">
            <Label>Título *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Reunião de equipe, Manutenção, Treinamento..."
              maxLength={100}
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label>Descrição (opcional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes do evento..."
              rows={3}
            />
          </div>

          {/* Data e Hora de Início */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Data Início *
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(startDate, 'dd/MM/yyyy', { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => {
                      if (date) {
                        setStartDate(date);
                        // If end date is before start date, update it
                        if (date > endDate) {
                          setEndDate(date);
                        }
                      }
                    }}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Horário Início *
              </Label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {timeSlots.map((time) => (
                    <SelectItem key={`start-${time}`} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Data e Hora de Fim */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Data Fim *
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(endDate, 'dd/MM/yyyy', { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && setEndDate(date)}
                    locale={ptBR}
                    disabled={(date) => date < startDate}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Horário Fim *
              </Label>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {timeSlots.map((time) => (
                    <SelectItem key={`end-${time}`} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tag Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <TagIcon className="h-4 w-4" />
              Tag (opcional)
            </Label>
            <Select value={tagId} onValueChange={setTagId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-gray-500">Sem tag</span>
                </SelectItem>
                {tags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span>{tag.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTag && (
              <div
                className="flex items-center gap-2 p-2 rounded-md text-sm"
                style={{ backgroundColor: `${selectedTag.color}15` }}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: selectedTag.color }}
                />
                <span style={{ color: selectedTag.color }}>{selectedTag.name}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              {editingEvent && (
                <Button
                  variant="outline"
                  onClick={handleDelete}
                  disabled={loading}
                  className="text-red-600 hover:bg-red-50 border-red-200 hover:border-red-300"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading || !title.trim()}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {loading ? 'Salvando...' : editingEvent ? 'Atualizar' : 'Criar Evento'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
