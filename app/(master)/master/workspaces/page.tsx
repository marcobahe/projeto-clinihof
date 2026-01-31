'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Building2, 
  Search, 
  Filter,
  Eye,
  Play,
  Pause,
  Plus,
  LogIn
} from 'lucide-react';
import Link from 'next/link';

interface Workspace {
  id: string;
  name: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
  plan: string;
  owner: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  userCount: number;
  createdAt: string;
  _count: {
    sales: number;
  };
}

interface WorkspacesResponse {
  workspaces: Workspace[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchWorkspaces();
  }, [page, statusFilter]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setPage(1);
      fetchWorkspaces();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [search]);

  const fetchWorkspaces = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      });

      if (search) {
        params.set('search', search);
      }

      if (statusFilter && statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      const response = await fetch(`/api/master/workspaces?${params}`);
      
      if (response.ok) {
        const data: WorkspacesResponse = await response.json();
        setWorkspaces(data.workspaces);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error fetching workspaces:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateWorkspaceStatus = async (id: string, newStatus: 'ACTIVE' | 'SUSPENDED') => {
    try {
      const response = await fetch(`/api/master/workspaces/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchWorkspaces(); // Refresh the list
      }
    } catch (error) {
      console.error('Error updating workspace status:', error);
    }
  };

  const impersonateWorkspace = async (workspaceId: string) => {
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
        return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Ativo</Badge>;
      case 'SUSPENDED':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Suspenso</Badge>;
      case 'CANCELLED':
        return <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPlanBadge = (plan: string) => {
    const planColors = {
      free: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      pro: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      enterprise: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
    };

    return (
      <Badge 
        variant="outline" 
        className={planColors[plan as keyof typeof planColors] || planColors.free}
      >
        {plan.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Workspaces</h1>
          <p className="text-gray-600 dark:text-gray-400">Gerenciar todas as clínicas da plataforma</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo Workspace
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por nome ou email do owner..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ACTIVE">Ativo</SelectItem>
                  <SelectItem value="SUSPENDED">Suspenso</SelectItem>
                  <SelectItem value="CANCELLED">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building2 className="h-5 w-5 mr-2" />
            Lista de Workspaces
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"></div>
              ))}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Usuários</TableHead>
                    <TableHead>Vendas</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workspaces.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <div className="text-gray-500 dark:text-gray-400">
                          <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Nenhum workspace encontrado</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    workspaces.map((workspace) => (
                      <TableRow key={workspace.id}>
                        <TableCell className="font-medium">{workspace.name}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{workspace.owner.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {workspace.owner.email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{getPlanBadge(workspace.plan)}</TableCell>
                        <TableCell>{getStatusBadge(workspace.status)}</TableCell>
                        <TableCell>{workspace.userCount}</TableCell>
                        <TableCell>{workspace._count.sales}</TableCell>
                        <TableCell>
                          {new Date(workspace.createdAt).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {workspace.status === 'ACTIVE' && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => impersonateWorkspace(workspace.id)}
                                className="text-purple-600 hover:text-purple-800 hover:bg-purple-50"
                                title="Entrar neste workspace"
                              >
                                <LogIn className="h-4 w-4" />
                              </Button>
                            )}
                            <Link href={`/master/workspaces/${workspace.id}`}>
                              <Button variant="ghost" size="sm" title="Visualizar detalhes">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            {workspace.status === 'ACTIVE' ? (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => updateWorkspaceStatus(workspace.id, 'SUSPENDED')}
                                className="text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50"
                                title="Suspender workspace"
                              >
                                <Pause className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => updateWorkspaceStatus(workspace.id, 'ACTIVE')}
                                className="text-green-600 hover:text-green-800 hover:bg-green-50"
                                title="Ativar workspace"
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Página {page} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}