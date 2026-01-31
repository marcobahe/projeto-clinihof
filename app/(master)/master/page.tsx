'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, CheckCircle, XCircle, DollarSign, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Stats {
  totalWorkspaces: number;
  totalUsers: number;
  activeWorkspaces: number;
  suspendedWorkspaces: number;
  cancelledWorkspaces: number;
  totalSales: number;
  totalRevenue: number;
}

interface Workspace {
  id: string;
  name: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
  plan: string;
  owner: {
    name: string;
    email: string;
  };
  userCount: number;
  createdAt: string;
}

export default function MasterDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentWorkspaces, setRecentWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, workspacesRes] = await Promise.all([
          fetch('/api/master/stats'),
          fetch('/api/master/workspaces?limit=5')
        ]);

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }

        if (workspacesRes.ok) {
          const workspacesData = await workspacesRes.json();
          setRecentWorkspaces(workspacesData.workspaces || []);
        }
      } catch (error) {
        console.error('Error fetching master dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard Master</h1>
            <p className="text-gray-600 dark:text-gray-400">Visão geral da plataforma CliniHOF</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-300 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-300 rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-gray-300 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Ativo</Badge>;
      case 'SUSPENDED':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Suspenso</Badge>;
      case 'CANCELLED':
        return <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard Master</h1>
          <p className="text-gray-600 dark:text-gray-400">Visão geral da plataforma CliniHOF</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-100 flex items-center">
              <Building2 className="h-4 w-4 mr-2" />
              Total Workspaces
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalWorkspaces || 0}</div>
            <p className="text-xs text-purple-100">Clínicas cadastradas</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-100 flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Total Usuários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-blue-100">Usuários na plataforma</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-100 flex items-center">
              <CheckCircle className="h-4 w-4 mr-2" />
              Workspaces Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeWorkspaces || 0}</div>
            <p className="text-xs text-green-100">Clínicas funcionando</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-100 flex items-center">
              <XCircle className="h-4 w-4 mr-2" />
              Workspaces Suspensos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.suspendedWorkspaces || 0}</div>
            <p className="text-xs text-orange-100">Clínicas suspensas</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              Receita Total da Plataforma
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats?.totalRevenue || 0)}</div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Todas as vendas registradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
              <TrendingUp className="h-4 w-4 mr-2" />
              Total de Vendas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats?.totalSales || 0}</div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Transações realizadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Workspaces */}
      <Card>
        <CardHeader>
          <CardTitle>Últimos Workspaces Criados</CardTitle>
        </CardHeader>
        <CardContent>
          {recentWorkspaces.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-4">
              Nenhum workspace encontrado
            </p>
          ) : (
            <div className="space-y-4">
              {recentWorkspaces.map((workspace) => (
                <div key={workspace.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium">{workspace.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {workspace.owner.name} ({workspace.owner.email})
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(workspace.status)}
                    <Badge variant="outline">{workspace.plan}</Badge>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(workspace.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}