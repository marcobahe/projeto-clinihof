'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Building2, Users, DollarSign, TrendingUp, Package, Stethoscope, LogIn } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface WorkspaceDetails {
  id: string;
  name: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
  plan: string;
  maxUsers: number;
  owner: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
  };
  createdAt: string;
  updatedAt: string;
  metrics: {
    patients: number;
    procedures: number;
    sales: number;
    collaborators: number;
    supplies: number;
    costs: number;
    packages: number;
    totalRevenue: number;
    monthlyRevenue: number;
    totalCosts: number;
  };
}

export default function WorkspaceDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [workspace, setWorkspace] = useState<WorkspaceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const workspaceId = params.id as string;

  useEffect(() => {
    if (workspaceId) {
      fetchWorkspaceDetails();
    }
  }, [workspaceId]);

  const fetchWorkspaceDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/master/workspaces/${workspaceId}`);
      
      if (response.ok) {
        const data = await response.json();
        setWorkspace(data);
      } else if (response.status === 404) {
        router.push('/master/workspaces');
      }
    } catch (error) {
      console.error('Error fetching workspace details:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateWorkspace = async (updates: Partial<{ status: string; plan: string; maxUsers: number }>) => {
    try {
      setUpdating(true);
      const response = await fetch(`/api/master/workspaces/${workspaceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const updatedWorkspace = await response.json();
        setWorkspace(prev => prev ? { ...prev, ...updatedWorkspace } : null);
      }
    } catch (error) {
      console.error('Error updating workspace:', error);
    } finally {
      setUpdating(false);
    }
  };

  const impersonateWorkspace = async () => {
    try {
      const response = await fetch('/api/master/impersonate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ workspaceId }),
      });

      if (response.ok) {
        // Redirecionar para o dashboard
        window.location.href = '/dashboard';
      } else {
        const error = await response.json();
        console.error('Error impersonating workspace:', error);
      }
    } catch (error) {
      console.error('Error impersonating workspace:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Ativo</Badge>;
      case 'SUSPENDED':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Suspenso</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="animate-pulse">
            <div className="h-4 w-4 bg-gray-300 rounded"></div>
          </Button>
          <div className="h-8 bg-gray-300 rounded w-64 animate-pulse"></div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-300 rounded w-1/2"></div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-4 bg-gray-300 rounded"></div>
              <div className="h-4 bg-gray-300 rounded"></div>
              <div className="h-4 bg-gray-300 rounded"></div>
            </CardContent>
          </Card>
          
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-2">
                  <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-300 rounded w-1/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 dark:text-gray-400">Workspace não encontrado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{workspace.name}</h1>
            <p className="text-gray-600 dark:text-gray-400">Detalhes do workspace</p>
          </div>
        </div>
        {workspace.status === 'ACTIVE' && (
          <Button 
            onClick={impersonateWorkspace}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <LogIn className="h-4 w-4 mr-2" />
            Entrar neste Workspace
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workspace Info */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="h-5 w-5 mr-2" />
              Informações do Workspace
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Nome</label>
              <p className="text-lg font-medium">{workspace.name}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Owner</label>
              <div className="mt-1">
                <p className="font-medium">{workspace.owner.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{workspace.owner.email}</p>
                <p className="text-xs text-gray-400">Role: {workspace.owner.role}</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Status</label>
              <div className="mt-1 flex items-center justify-between">
                {getStatusBadge(workspace.status)}
                <Select 
                  value={workspace.status} 
                  onValueChange={(value) => updateWorkspace({ status: value })}
                  disabled={updating}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Ativo</SelectItem>
                    <SelectItem value="SUSPENDED">Suspenso</SelectItem>
                    <SelectItem value="CANCELLED">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Plano</label>
              <div className="mt-1">
                <Select 
                  value={workspace.plan} 
                  onValueChange={(value) => updateWorkspace({ plan: value })}
                  disabled={updating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Máximo de Usuários</label>
              <p className="text-lg font-medium">{workspace.maxUsers}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Criado em</label>
              <p className="text-sm">{new Date(workspace.createdAt).toLocaleDateString('pt-BR')}</p>
            </div>
          </CardContent>
        </Card>

        {/* Metrics */}
        <div className="lg:col-span-2 space-y-6">
          {/* Financial Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-100 flex items-center">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Receita Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(workspace.metrics.totalRevenue)}</div>
                <p className="text-xs text-green-100">Todas as vendas</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-100 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Receita Mensal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(workspace.metrics.monthlyRevenue)}</div>
                <p className="text-xs text-blue-100">Mês atual</p>
              </CardContent>
            </Card>
          </div>

          {/* Activity Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Pacientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{workspace.metrics.patients}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Vendas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{workspace.metrics.sales}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Colaboradores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{workspace.metrics.collaborators}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
                  <Stethoscope className="h-4 w-4 mr-2" />
                  Procedimentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{workspace.metrics.procedures}</div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
                  <Package className="h-4 w-4 mr-2" />
                  Insumos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{workspace.metrics.supplies}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
                  <Package className="h-4 w-4 mr-2" />
                  Pacotes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{workspace.metrics.packages}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Custos Fixos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(workspace.metrics.totalCosts)}</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}