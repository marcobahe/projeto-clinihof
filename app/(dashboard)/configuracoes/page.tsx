'use client';

import { useEffect, useState } from 'react';
import { 
  Settings, 
  Calendar as CalendarIcon, 
  DollarSign, 
  Clock, 
  Building2, 
  RefreshCw,
  Check,
  AlertCircle,
  ExternalLink,
  Loader2,
  Upload,
  ImageIcon,
  Trash2,
  FileText,
  CreditCard,
  ScrollText
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface WorkspaceSettings {
  id: string;
  workspaceId: string;
  monthlyFixedCosts: number;
  monthlyWorkingHours: number;
  hourlyClinicCost: number | null;
  googleCalendarEnabled: boolean;
  googleCalendarId: string | null;
  lastGoogleSync: string | null;
  hasGoogleAccount?: boolean;
  paymentTerms: string | null;
  quoteTerms: string | null;
}

interface GoogleCalendar {
  id: string;
  summary: string;
  description: string | null;
  primary: boolean;
  backgroundColor: string | null;
}

export default function ConfiguracoesPage() {
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [loadingCalendars, setLoadingCalendars] = useState(false);
  const [googleCalendars, setGoogleCalendars] = useState<GoogleCalendar[]>([]);

  // Logo states
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [deletingLogo, setDeletingLogo] = useState(false);

  // Form states
  const [monthlyFixedCosts, setMonthlyFixedCosts] = useState<string>('0');
  const [monthlyWorkingHours, setMonthlyWorkingHours] = useState<string>('176');
  const [googleCalendarEnabled, setGoogleCalendarEnabled] = useState(false);
  const [googleCalendarId, setGoogleCalendarId] = useState<string>('primary');

  // Quote settings states
  const [paymentTerms, setPaymentTerms] = useState<string>('');
  const [quoteTerms, setQuoteTerms] = useState<string>('');

  // Fetch clinic logo
  const fetchLogo = async () => {
    try {
      const response = await fetch('/api/settings/logo');
      if (response.ok) {
        const data = await response.json();
        setLogoPreview(data.logo || null);
      }
    } catch (error) {
      console.error('Error fetching logo:', error);
    }
  };

  // Upload clinic logo
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
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
      // Reset input
      e.target.value = '';
    }
  };

  // Delete clinic logo
  const handleDeleteLogo = async () => {
    setDeletingLogo(true);
    try {
      const response = await fetch('/api/settings/logo', {
        method: 'DELETE',
      });

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

  // Fetch Google calendars
  const fetchGoogleCalendars = async () => {
    try {
      setLoadingCalendars(true);
      const response = await fetch('/api/google-calendar/calendars');
      if (response.ok) {
        const data = await response.json();
        setGoogleCalendars(data.calendars || []);
      }
    } catch (error) {
      console.error('Error fetching Google calendars:', error);
    } finally {
      setLoadingCalendars(false);
    }
  };

  // Fetch settings
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        setMonthlyFixedCosts(data.monthlyFixedCosts?.toString() || '0');
        setMonthlyWorkingHours(data.monthlyWorkingHours?.toString() || '176');
        setGoogleCalendarEnabled(data.googleCalendarEnabled || false);
        setGoogleCalendarId(data.googleCalendarId || 'primary');
        setPaymentTerms(data.paymentTerms || '');
        setQuoteTerms(data.quoteTerms || '');

        // Fetch Google calendars if account is connected
        if (data.hasGoogleAccount) {
          fetchGoogleCalendars();
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchLogo();
  }, []);

  // Calculate hourly cost
  const calculatedHourlyCost = 
    parseFloat(monthlyWorkingHours) > 0 
      ? parseFloat(monthlyFixedCosts) / parseFloat(monthlyWorkingHours) 
      : 0;

  // Save settings
  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthlyFixedCosts: parseFloat(monthlyFixedCosts),
          monthlyWorkingHours: parseFloat(monthlyWorkingHours),
          googleCalendarEnabled,
          googleCalendarId,
          paymentTerms,
          quoteTerms,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSettings({ ...settings, ...data });
        toast.success('Configurações salvas com sucesso!');
      } else {
        throw new Error('Erro ao salvar');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  // Calculate costs from Cost model
  const handleCalculateCosts = async () => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setMonthlyFixedCosts(data.totalMonthlyFixedCosts.toString());
        toast.success(`Custos calculados: R$ ${data.totalMonthlyFixedCosts.toFixed(2)}`);
      }
    } catch (error) {
      console.error('Error calculating costs:', error);
      toast.error('Erro ao calcular custos');
    }
  };

  // Sync with Google Calendar
  const handleSyncGoogleCalendar = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/google-calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncAll: true }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`${data.synced} agendamentos sincronizados!`);
        fetchSettings();
      } else {
        throw new Error('Erro ao sincronizar');
      }
    } catch (error) {
      console.error('Error syncing:', error);
      toast.error('Erro ao sincronizar com Google Calendar');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Carregando configurações...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Configurações
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Gerencie as configurações da sua clínica
        </p>
      </div>

      {/* Clinic Logo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-purple-600" />
            Logomarca da Clínica
          </CardTitle>
          <CardDescription>
            Faça upload da logomarca para exibir nos PDFs de orçamento. Recomendado: 400×150px, formato PNG com fundo transparente para melhor resultado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {logoPreview ? (
            <div className="space-y-4">
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
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleLogoUpload}
                className="hidden"
                disabled={uploadingLogo}
              />
              <div className="flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-colors">
                {uploadingLogo ? (
                  <Loader2 className="h-10 w-10 text-purple-400 animate-spin mb-3" />
                ) : (
                  <Upload className="h-10 w-10 text-gray-400 mb-3" />
                )}
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {uploadingLogo ? 'Enviando...' : 'Clique para fazer upload da logomarca'}
                </span>
                <span className="text-xs text-gray-400 mt-1">
                  PNG ou JPEG • Máximo 500KB
                </span>
              </div>
            </label>
          )}
        </CardContent>
      </Card>

      {/* Quote Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-600" />
            Configurações de Orçamento
          </CardTitle>
          <CardDescription>
            Defina as formas de pagamento e termos padrão que aparecerão nos PDFs de orçamento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="paymentTerms" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Formas de Pagamento
            </Label>
            <Textarea
              id="paymentTerms"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              placeholder={"Ex: PIX com 5% de desconto\nCartão de crédito em até 12x\nBoleto bancário (à vista)\nDinheiro"}
              rows={4}
              className="resize-y"
            />
            <p className="text-xs text-gray-500">
              Informe as formas de pagamento aceitas pela clínica. Este texto será exibido em todos os PDFs de orçamento.
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="quoteTerms" className="flex items-center gap-2">
              <ScrollText className="h-4 w-4" />
              Termos e Condições
            </Label>
            <Textarea
              id="quoteTerms"
              value={quoteTerms}
              onChange={(e) => setQuoteTerms(e.target.value)}
              placeholder={"Ex: Valores sujeitos a alteração sem aviso prévio. Os resultados podem variar de acordo com cada paciente. O orçamento não inclui exames complementares. Cancelamentos devem ser comunicados com 24h de antecedência."}
              rows={5}
              className="resize-y"
            />
            <p className="text-xs text-gray-500">
              Defina os termos e condições padrão. Este texto aparecerá em fonte menor no final do PDF de orçamento.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Clinic Costs Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-purple-600" />
              Custos da Clínica
            </CardTitle>
            <CardDescription>
              Configure os custos fixos mensais para calcular o custo por hora da clínica
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="monthlyFixedCosts" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Custos Fixos Mensais (R$)
              </Label>
              <div className="flex gap-2">
                <Input
                  id="monthlyFixedCosts"
                  type="number"
                  step="0.01"
                  min="0"
                  value={monthlyFixedCosts}
                  onChange={(e) => setMonthlyFixedCosts(e.target.value)}
                  placeholder="Ex: 15000.00"
                />
                <Button 
                  variant="outline" 
                  onClick={handleCalculateCosts}
                  title="Calcular automaticamente dos custos cadastrados"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Soma de aluguel, água, luz, internet, salários, etc.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthlyWorkingHours" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Horas Trabalhadas por Mês
              </Label>
              <Input
                id="monthlyWorkingHours"
                type="number"
                step="1"
                min="1"
                value={monthlyWorkingHours}
                onChange={(e) => setMonthlyWorkingHours(e.target.value)}
                placeholder="Ex: 176"
              />
              <p className="text-xs text-gray-500">
                Padrão: 176h (22 dias × 8h)
              </p>
            </div>

            <Separator />

            <div className="rounded-lg bg-purple-50 dark:bg-purple-900/20 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Custo por Hora da Clínica
                  </div>
                  <div className="text-2xl font-bold text-purple-600">
                    R$ {calculatedHourlyCost.toFixed(2)}
                  </div>
                </div>
                <DollarSign className="h-10 w-10 text-purple-300" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Este valor é usado nos cálculos de custo dos procedimentos
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Google Calendar Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-purple-600" />
              Integração Google Calendar
            </CardTitle>
            <CardDescription>
              Sincronize agendamentos automaticamente com o Google Calendar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Google Account Status */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                {settings?.hasGoogleAccount ? (
                  <Check className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                )}
                <div>
                  <div className="font-medium text-sm">Conta Google</div>
                  <div className="text-xs text-gray-500">
                    {settings?.hasGoogleAccount 
                      ? 'Conectada' 
                      : 'Não conectada - Faça login com Google'}
                  </div>
                </div>
              </div>
              {!settings?.hasGoogleAccount && (
                <Button variant="outline" size="sm" asChild>
                  <a href="/api/auth/signin/google">
                    Conectar <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </Button>
              )}
            </div>

            {/* Enable/Disable Sync */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700">
              <div>
                <Label className="font-medium">Sincronização Automática</Label>
                <p className="text-xs text-gray-500">
                  Agendamentos serão criados/atualizados no Google Calendar
                </p>
              </div>
              <Switch
                checked={googleCalendarEnabled}
                onCheckedChange={setGoogleCalendarEnabled}
                disabled={!settings?.hasGoogleAccount}
              />
            </div>

            {/* Calendar Selection */}
            <div className="space-y-2">
              <Label htmlFor="googleCalendarId">Calendário</Label>
              {loadingCalendars ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando calendários...
                </div>
              ) : googleCalendars.length > 0 ? (
                <Select
                  value={googleCalendarId}
                  onValueChange={setGoogleCalendarId}
                  disabled={!settings?.hasGoogleAccount}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um calendário" />
                  </SelectTrigger>
                  <SelectContent>
                    {googleCalendars.map((cal) => (
                      <SelectItem key={cal.id} value={cal.id || 'primary'}>
                        <div className="flex items-center gap-2">
                          {cal.backgroundColor && (
                            <span
                              className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: cal.backgroundColor }}
                            />
                          )}
                          <span>{cal.summary}{cal.primary ? ' (Principal)' : ''}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="googleCalendarId"
                  value={googleCalendarId}
                  onChange={(e) => setGoogleCalendarId(e.target.value)}
                  placeholder="primary"
                  disabled={!settings?.hasGoogleAccount}
                />
              )}
              <p className="text-xs text-gray-500">
                {googleCalendars.length > 0
                  ? 'Selecione o calendário onde os agendamentos serão sincronizados'
                  : 'Use "primary" para o calendário principal ou o ID de um calendário específico'}
              </p>
            </div>

            {/* Last Sync Info */}
            {settings?.lastGoogleSync && (
              <div className="text-xs text-gray-500">
                Última sincronização: {new Date(settings.lastGoogleSync).toLocaleString('pt-BR')}
              </div>
            )}

            {/* Sync Button */}
            <Button
              onClick={handleSyncGoogleCalendar}
              disabled={!settings?.hasGoogleAccount || !googleCalendarEnabled || syncing}
              variant="outline"
              className="w-full"
            >
              {syncing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sincronizar Agora
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSaveSettings} 
          disabled={saving}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>

      {/* KPI Preview Card */}
      <Card>
        <CardHeader>
          <CardTitle>Métricas Calculadas</CardTitle>
          <CardDescription>
            Valores que serão exibidos no dashboard e usados nos cálculos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-500">Custos Mensais</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                R$ {parseFloat(monthlyFixedCosts).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-500">Horas/Mês</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {monthlyWorkingHours}h
              </div>
            </div>
            <div className="p-4 rounded-lg border border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20">
              <div className="text-sm text-purple-600 dark:text-purple-400">Custo/Hora</div>
              <div className="text-2xl font-bold text-purple-600">
                R$ {calculatedHourlyCost.toFixed(2)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
