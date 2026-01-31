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
  ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
}

export default function ConfiguracoesPage() {
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Form states
  const [monthlyFixedCosts, setMonthlyFixedCosts] = useState<string>('0');
  const [monthlyWorkingHours, setMonthlyWorkingHours] = useState<string>('176');
  const [googleCalendarEnabled, setGoogleCalendarEnabled] = useState(false);
  const [googleCalendarId, setGoogleCalendarId] = useState<string>('primary');

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

            {/* Calendar ID */}
            <div className="space-y-2">
              <Label htmlFor="googleCalendarId">ID do Calendário</Label>
              <Input
                id="googleCalendarId"
                value={googleCalendarId}
                onChange={(e) => setGoogleCalendarId(e.target.value)}
                placeholder="primary"
                disabled={!settings?.hasGoogleAccount}
              />
              <p className="text-xs text-gray-500">
                Use "primary" para o calendário principal ou o ID de um calendário específico
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
