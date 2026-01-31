'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Tag as TagIcon, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface Tag {
  id: string;
  name: string;
  color: string;
  _count?: {
    events: number;
  };
}

interface TagManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onTagsChanged?: () => void;
}

const PRESET_COLORS = [
  { name: 'Azul', color: '#3B82F6' },
  { name: 'Verde', color: '#22C55E' },
  { name: 'Vermelho', color: '#EF4444' },
  { name: 'Roxo', color: '#8B5CF6' },
  { name: 'Laranja', color: '#F97316' },
  { name: 'Rosa', color: '#EC4899' },
  { name: 'Amarelo', color: '#EAB308' },
  { name: 'Ciano', color: '#06B6D4' },
  { name: 'Índigo', color: '#6366F1' },
  { name: 'Esmeralda', color: '#10B981' },
  { name: 'Âmbar', color: '#F59E0B' },
  { name: 'Cinza', color: '#6B7280' },
];

export function TagManager({ isOpen, onClose, onTagsChanged }: TagManagerProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState('#8B5CF6');

  const fetchTags = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tags');
      if (response.ok) {
        const data = await response.json();
        setTags(data);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTags();
    }
  }, [isOpen]);

  const resetForm = () => {
    setTagName('');
    setTagColor('#8B5CF6');
    setEditingTag(null);
    setShowForm(false);
  };

  const handleStartEdit = (tag: Tag) => {
    setEditingTag(tag);
    setTagName(tag.name);
    setTagColor(tag.color);
    setShowForm(true);
  };

  const handleStartCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!tagName.trim()) {
      toast.error('Nome da tag é obrigatório');
      return;
    }

    try {
      setLoading(true);
      let response: Response;

      if (editingTag) {
        response = await fetch(`/api/tags/${editingTag.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: tagName.trim(), color: tagColor }),
        });
      } else {
        response = await fetch('/api/tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: tagName.trim(), color: tagColor }),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao salvar tag');
      }

      toast.success(editingTag ? 'Tag atualizada!' : 'Tag criada!');
      resetForm();
      fetchTags();
      onTagsChanged?.();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar tag');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (tag: Tag) => {
    if (!confirm(`Deseja realmente excluir a tag "${tag.name}"?`)) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/tags/${tag.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao deletar tag');
      }

      toast.success('Tag excluída!');
      fetchTags();
      onTagsChanged?.();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir tag');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TagIcon className="h-5 w-5 text-purple-600" />
            Gerenciar Tags
          </DialogTitle>
          <DialogDescription>
            Crie e gerencie tags coloridas para organizar seus eventos no calendário
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Lista de Tags Existentes */}
          {tags.length > 0 && (
            <div className="space-y-2">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: tag.color }}
                    />
                    <div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {tag.name}
                      </span>
                      {tag._count && (
                        <span className="ml-2 text-xs text-gray-500">
                          ({tag._count.events} {tag._count.events === 1 ? 'evento' : 'eventos'})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStartEdit(tag)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(tag)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tags.length === 0 && !showForm && (
            <div className="text-center py-6 text-gray-500">
              <TagIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>Nenhuma tag criada ainda</p>
              <p className="text-sm">Crie tags para organizar seus eventos</p>
            </div>
          )}

          {/* Formulário de Criação/Edição */}
          {showForm && (
            <div className="space-y-4 p-4 rounded-lg border-2 border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/10">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  {editingTag ? 'Editar Tag' : 'Nova Tag'}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetForm}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Nome da Tag</Label>
                <Input
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  placeholder="Ex: Consulta, Retorno, Urgente..."
                  maxLength={50}
                />
              </div>

              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="grid grid-cols-6 gap-2">
                  {PRESET_COLORS.map((preset) => (
                    <button
                      key={preset.color}
                      type="button"
                      onClick={() => setTagColor(preset.color)}
                      className={`w-full aspect-square rounded-lg border-2 transition-all hover:scale-110 ${
                        tagColor === preset.color
                          ? 'border-gray-900 dark:border-white scale-110 shadow-lg'
                          : 'border-transparent'
                      }`}
                      style={{ backgroundColor: preset.color }}
                      title={preset.name}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Label className="text-sm text-gray-500">Personalizada:</Label>
                  <input
                    type="color"
                    value={tagColor}
                    onChange={(e) => setTagColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border border-gray-300"
                  />
                  <Input
                    value={tagColor}
                    onChange={(e) => setTagColor(e.target.value)}
                    className="w-28 font-mono text-sm"
                    maxLength={7}
                  />
                </div>
              </div>

              {/* Preview */}
              <div className="space-y-2">
                <Label className="text-sm text-gray-500">Preview</Label>
                <div
                  className="flex items-center gap-2 p-2 rounded-md"
                  style={{ backgroundColor: `${tagColor}20` }}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: tagColor }}
                  />
                  <span
                    className="text-sm font-medium"
                    style={{ color: tagColor }}
                  >
                    {tagName || 'Nome da Tag'}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={resetForm} size="sm">
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={loading || !tagName.trim()}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {loading ? 'Salvando...' : editingTag ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </div>
          )}

          {/* Botão para adicionar nova tag */}
          {!showForm && (
            <Button
              onClick={handleStartCreate}
              variant="outline"
              className="w-full border-dashed border-purple-300 text-purple-600 hover:bg-purple-50 dark:border-purple-700 dark:hover:bg-purple-900/20"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Tag
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
