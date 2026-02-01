'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Upload,
  Loader2,
  Trash2,
  CreditCard,
  ScrollText,
  ImageIcon,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface QuoteSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuoteSettingsModal({ open, onOpenChange }: QuoteSettingsModalProps) {
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [deletingLogo, setDeletingLogo] = useState(false);
  const [paymentTerms, setPaymentTerms] = useState('');
  const [quoteTerms, setQuoteTerms] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, logoRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/settings/logo'),
      ]);

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setPaymentTerms(data.paymentTerms || '');
        setQuoteTerms(data.quoteTerms || '');
      }

      if (logoRes.ok) {
        const data = await logoRes.json();
        setLogoPreview(data.logo || null);
      }
    } catch (error) {
      console.error('Error fetching quote settings:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, fetchData]);

  const processFile = async (file: File) => {
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      toast.error('Formato inválido (use PNG ou JPEG)');
      return;
    }
    if (file.size > 500 * 1024) {
      toast.error('Arquivo muito grande (máx 500KB)');
      return;
    }

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await fetch('/api/settings/logo', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setLogoPreview(data.logo);
        toast.success('Logomarca salva com sucesso!');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erro ao enviar logomarca');
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Erro ao enviar logomarca');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
    e.target.value = '';
  };

  const handleDeleteLogo = async () => {
    setDeletingLogo(true);
    try {
      const response = await fetch('/api/settings/logo', { method: 'DELETE' });
      if (response.ok) {
        setLogoPreview(null);
        toast.success('Logomarca removida com sucesso!');
      } else {
        toast.error('Erro ao remover logomarca');
      }
    } catch (error) {
      console.error('Error deleting logo:', error);
      toast.error('Erro ao remover logomarca');
    } finally {
      setDeletingLogo(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Fetch current settings first to preserve other fields
      const currentRes = await fetch('/api/settings');
      if (!currentRes.ok) throw new Error('Erro ao carregar configurações atuais');
      const current = await currentRes.json();

      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthlyFixedCosts: current.monthlyFixedCosts,
          monthlyWorkingHours: current.monthlyWorkingHours,
          googleCalendarEnabled: current.googleCalendarEnabled,
          googleCalendarId: current.googleCalendarId,
          paymentTerms,
          quoteTerms,
        }),
      });

      if (response.ok) {
        toast.success('Configurações de orçamento salvas com sucesso!');
        onOpenChange(false);
      } else {
        throw new Error('Erro ao salvar');
      }
    } catch (error) {
      console.error('Error saving quote settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-purple-600" />
            Configurações de Orçamento
          </DialogTitle>
          <DialogDescription>
            Configure a logomarca, formas de pagamento e termos que aparecerão nos PDFs de orçamento
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Logo Upload */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Logomarca da Clínica
              </Label>
              <p className="text-xs text-muted-foreground">
                Recomendado: 400×150px, formato PNG com fundo transparente para melhor resultado.
              </p>

              {logoPreview ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
                    <img
                      src={logoPreview}
                      alt="Logomarca da clínica"
                      className="max-h-24 max-w-[300px] object-contain"
                    />
                  </div>
                  <div className="flex gap-2">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/png,image/jpeg"
                        onChange={handleLogoUpload}
                        className="hidden"
                        disabled={uploadingLogo}
                      />
                      <Button variant="outline" size="sm" asChild disabled={uploadingLogo}>
                        <span>
                          {uploadingLogo ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4 mr-2" />
                          )}
                          Alterar Logo
                        </span>
                      </Button>
                    </label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteLogo}
                      disabled={deletingLogo}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {deletingLogo ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      Remover
                    </Button>
                  </div>
                </div>
              ) : (
                <label
                  className="cursor-pointer"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={handleLogoUpload}
                    className="hidden"
                    disabled={uploadingLogo}
                  />
                  <div
                    className={`flex flex-col items-center justify-center p-8 rounded-lg border-2 border-dashed transition-colors ${
                      isDragging
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/10'
                    }`}
                  >
                    {uploadingLogo ? (
                      <Loader2 className="h-10 w-10 text-purple-400 animate-spin mb-3" />
                    ) : (
                      <Upload className="h-10 w-10 text-gray-400 mb-3" />
                    )}
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {uploadingLogo
                        ? 'Enviando...'
                        : 'Clique ou arraste para fazer upload da logomarca'}
                    </span>
                    <span className="text-xs text-gray-400 mt-1">
                      PNG ou JPEG • Máximo 500KB
                    </span>
                  </div>
                </label>
              )}
            </div>

            <Separator />

            {/* Payment Terms */}
            <div className="space-y-2">
              <Label htmlFor="modal-paymentTerms" className="flex items-center gap-2 text-sm font-semibold">
                <CreditCard className="h-4 w-4" />
                Formas de Pagamento
              </Label>
              <Textarea
                id="modal-paymentTerms"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder={
                  'Ex: PIX com 5% de desconto\nCartão de crédito em até 12x\nBoleto bancário (à vista)\nDinheiro'
                }
                rows={4}
                className="resize-y"
              />
              <p className="text-xs text-muted-foreground">
                Informe as formas de pagamento aceitas. Este texto será exibido nos PDFs de orçamento.
              </p>
            </div>

            <Separator />

            {/* Quote Terms */}
            <div className="space-y-2">
              <Label htmlFor="modal-quoteTerms" className="flex items-center gap-2 text-sm font-semibold">
                <ScrollText className="h-4 w-4" />
                Termos e Condições
              </Label>
              <Textarea
                id="modal-quoteTerms"
                value={quoteTerms}
                onChange={(e) => setQuoteTerms(e.target.value)}
                placeholder={
                  'Ex: Valores sujeitos a alteração sem aviso prévio. Os resultados podem variar de acordo com cada paciente. O orçamento não inclui exames complementares. Cancelamentos devem ser comunicados com 24h de antecedência.'
                }
                rows={5}
                className="resize-y"
              />
              <p className="text-xs text-muted-foreground">
                Defina os termos e condições padrão. Este texto aparecerá no final do PDF de orçamento.
              </p>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Configurações'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
