'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  Users, 
  Search, 
  Filter,
  Crown,
  Shield,
  User,
  UserCheck,
  Key
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { UserRole } from '@prisma/client';

interface User {
  id: string;
  name: string;
  fullName: string;
  email: string;
  role: UserRole;
  createdAt: string;
  workspaces: {
    id: string;
    name: string;
    status: string;
    plan: string;
  }[];
  lastLogin: string | null;
}

interface UsersResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [resetingUserId, setResetingUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setPage(1);
      fetchUsers();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [search]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      });

      if (search) {
        params.set('search', search);
      }

      if (roleFilter && roleFilter !== 'all') {
        params.set('role', roleFilter);
      }

      const response = await fetch(`/api/master/users?${params}`);
      
      if (response.ok) {
        const data: UsersResponse = await response.json();
        setUsers(data.users);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      const response = await fetch(`/api/master/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        fetchUsers(); // Refresh the list
      }
    } catch (error) {
      console.error('Error updating user role:', error);
    }
  };

  const resetUserPassword = async (userId: string, userName: string) => {
    try {
      setResetingUserId(userId);
      const response = await fetch(`/api/master/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'reset-password' }),
      });

      if (response.ok) {
        const data = await response.json();
        setTempPassword(data.tempPassword);
        setResetDialogOpen(true);
        toast({
          title: 'Senha resetada',
          description: `Senha temporária gerada para ${userName}`,
        });
      } else {
        const errorData = await response.json();
        toast({
          title: 'Erro',
          description: errorData.error || 'Erro ao resetar senha',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao resetar senha',
        variant: 'destructive',
      });
    } finally {
      setResetingUserId(null);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case UserRole.MASTER:
        return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
          <Crown className="h-3 w-3 mr-1" />
          MASTER
        </Badge>;
      case UserRole.ADMIN:
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          <Shield className="h-3 w-3 mr-1" />
          ADMIN
        </Badge>;
      case UserRole.MANAGER:
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          <UserCheck className="h-3 w-3 mr-1" />
          MANAGER
        </Badge>;
      case UserRole.USER:
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          <User className="h-3 w-3 mr-1" />
          USER
        </Badge>;
      case UserRole.RECEPTIONIST:
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
          <User className="h-3 w-3 mr-1" />
          RECEPTIONIST
        </Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Usuários</h1>
          <p className="text-gray-600 dark:text-gray-400">Gerenciar todos os usuários da plataforma</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="MASTER">Master</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="USER">User</SelectItem>
                  <SelectItem value="RECEPTIONIST">Receptionist</SelectItem>
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
            <Users className="h-5 w-5 mr-2" />
            Lista de Usuários
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
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Workspaces</TableHead>
                    <TableHead>Último Login</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                    <TableHead className="text-right">Alterar Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <div className="text-gray-500 dark:text-gray-400">
                          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Nenhum usuário encontrado</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{user.name || user.fullName}</p>
                            {user.name && user.fullName && user.name !== user.fullName && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">{user.fullName}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {user.workspaces.length === 0 ? (
                              <span className="text-sm text-gray-500 dark:text-gray-400">Nenhum workspace</span>
                            ) : (
                              user.workspaces.map((workspace) => (
                                <div key={workspace.id} className="flex items-center space-x-2">
                                  <span className="text-sm font-medium">{workspace.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {workspace.plan}
                                  </Badge>
                                </div>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.lastLogin ? (
                            new Date(user.lastLogin).toLocaleDateString('pt-BR')
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">Nunca</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resetUserPassword(user.id, user.name || user.fullName)}
                            disabled={resetingUserId === user.id}
                            className="h-8 px-2"
                          >
                            <Key className="h-3 w-3 mr-1" />
                            {resetingUserId === user.id ? 'Resetando...' : 'Resetar Senha'}
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          <Select 
                            value={user.role} 
                            onValueChange={(value) => updateUserRole(user.id, value as UserRole)}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={UserRole.MASTER}>Master</SelectItem>
                              <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                              <SelectItem value={UserRole.MANAGER}>Manager</SelectItem>
                              <SelectItem value={UserRole.USER}>User</SelectItem>
                              <SelectItem value={UserRole.RECEPTIONIST}>Receptionist</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-2 mt-6">
                  <button
                    className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Anterior
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Página {page} de {totalPages}
                  </span>
                  <button
                    className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Próxima
                  </button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Password Reset Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Key className="h-5 w-5 mr-2 text-green-600" />
              Senha Temporária Gerada
            </DialogTitle>
            <DialogDescription>
              A senha foi resetada com sucesso. Compartilhe essa senha temporária com o usuário:
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2">
            <div className="grid flex-1 gap-2">
              <div className="flex items-center justify-center">
                <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <span className="text-lg font-mono font-bold text-purple-600 dark:text-purple-400">
                    {tempPassword}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-center space-x-2 mt-4">
            <Button
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(tempPassword);
                toast({
                  title: 'Copiado!',
                  description: 'Senha copiada para a área de transferência',
                });
              }}
            >
              Copiar Senha
            </Button>
            <DialogClose asChild>
              <Button size="sm" variant="outline">
                Fechar
              </Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}