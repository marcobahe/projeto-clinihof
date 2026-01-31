'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings, Package, Users, Building2, Crown } from 'lucide-react';

const plans = [
  {
    name: 'Free',
    price: 'Grátis',
    description: 'Plano básico para clínicas pequenas',
    features: [
      'Até 5 usuários',
      '100 pacientes',
      'Agendamentos básicos',
      'Relatórios simples',
      'Suporte por email'
    ],
    maxUsers: 5,
    maxPatients: 100,
    color: 'gray'
  },
  {
    name: 'Pro',
    price: 'R$ 99/mês',
    description: 'Plano completo para clínicas em crescimento',
    features: [
      'Até 20 usuários',
      'Pacientes ilimitados',
      'Agendamentos avançados',
      'Relatórios completos',
      'Integração com WhatsApp',
      'Suporte prioritário'
    ],
    maxUsers: 20,
    maxPatients: -1, // unlimited
    color: 'blue'
  },
  {
    name: 'Enterprise',
    price: 'R$ 299/mês',
    description: 'Solução completa para grandes clínicas',
    features: [
      'Usuários ilimitados',
      'Pacientes ilimitados',
      'Múltiplas filiais',
      'API personalizada',
      'Relatórios avançados',
      'Suporte 24/7',
      'Treinamento incluso'
    ],
    maxUsers: -1, // unlimited
    maxPatients: -1, // unlimited
    color: 'purple'
  }
];

export default function SettingsPage() {
  const getPlanBadge = (planName: string) => {
    const plan = plans.find(p => p.name.toLowerCase() === planName.toLowerCase());
    if (!plan) return <Badge variant="outline">{planName}</Badge>;

    const colorClasses = {
      gray: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
    };

    return (
      <Badge className={colorClasses[plan.color as keyof typeof colorClasses]}>
        {plan.name}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Configurações Master</h1>
          <p className="text-gray-600 dark:text-gray-400">Configurações globais da plataforma CliniHOF</p>
        </div>
      </div>

      {/* Platform Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Crown className="h-5 w-5 mr-2" />
            Informações da Plataforma
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <Building2 className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <h3 className="font-semibold">CliniHOF SaaS</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Plataforma de gestão para clínicas de estética</p>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Settings className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <h3 className="font-semibold">Versão 1.0</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Master Admin Panel - Fase 1</p>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <Users className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <h3 className="font-semibold">Multi-tenant</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Suporte a múltiplas clínicas</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plans */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="h-5 w-5 mr-2" />
            Planos Disponíveis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card key={plan.name} className="relative">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    {getPlanBadge(plan.name)}
                  </div>
                  <div className="text-2xl font-bold text-green-600">{plan.price}</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{plan.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <div className="text-lg font-semibold">
                          {plan.maxUsers === -1 ? '∞' : plan.maxUsers}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Usuários</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <div className="text-lg font-semibold">
                          {plan.maxPatients === -1 ? '∞' : plan.maxPatients}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Pacientes</div>
                      </div>
                    </div>
                    
                    <ul className="space-y-2">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start text-sm">
                          <span className="text-green-500 mr-2 mt-0.5">✓</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Future Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações Futuras</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-gray-600 dark:text-gray-400">
            <div className="flex items-center justify-between p-4 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Mensagem de Manutenção</h3>
                <p className="text-sm">Exibir mensagem global quando a plataforma estiver em manutenção</p>
              </div>
              <Badge variant="outline">Em breve</Badge>
            </div>
            
            <div className="flex items-center justify-between p-4 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Configurações de Email</h3>
                <p className="text-sm">Configurar SMTP global para envio de emails da plataforma</p>
              </div>
              <Badge variant="outline">Em breve</Badge>
            </div>
            
            <div className="flex items-center justify-between p-4 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Backup Automatizado</h3>
                <p className="text-sm">Configurar backups automáticos do banco de dados</p>
              </div>
              <Badge variant="outline">Em breve</Badge>
            </div>
            
            <div className="flex items-center justify-between p-4 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Logs de Sistema</h3>
                <p className="text-sm">Visualizar logs de atividades e erros da plataforma</p>
              </div>
              <Badge variant="outline">Em breve</Badge>
            </div>
            
            <div className="flex items-center justify-between p-4 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Métricas Avançadas</h3>
                <p className="text-sm">Dashboard com métricas detalhadas de uso e performance</p>
              </div>
              <Badge variant="outline">Em breve</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}