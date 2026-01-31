'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Users, Shield, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { roleLabels, roleDescriptions } from '@/lib/rbac';
import { UserRole } from '@prisma/client';

interface User {
  id: string;
  name: string;
  email: string;
  fullName: string;
  role: UserRole;
  image?: string;
  createdAt: string;
}

const roleBadgeColors: Record<UserRole, string> = {
  ADMIN: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  MANAGER: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  USER: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  RECEPTIONIST: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
};

export default function UsuariosPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users');
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao carregar usuários');
      }
      const data = await response.json();
      setUsers(data);
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      setUpdating(userId);
      const response = await fetch(`/api/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao atualizar permissão');
      }

      toast.success('Permissão atualizada com sucesso');
      fetchUsers();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Erro ao atualizar permissão');
    } finally {
      setUpdating(null);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="p-8 space-y-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
          <Shield className="h-10 w-10 text-purple-600" />
          Gerenciamento de Usuários
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Configure as permissões de acesso dos usuários do sistema
        </p>
      </div>

      {/* Role Descriptions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {(Object.keys(roleLabels) as UserRole[]).map((role) => (
          <Card key={role} className="border-l-4" style={{ borderLeftColor: role === 'ADMIN' ? '#ef4444' : role === 'MANAGER' ? '#3b82f6' : role === 'USER' ? '#22c55e' : '#eab308' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{roleLabels[role]}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {roleDescriptions[role]}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Usuários ({users.length})
          </CardTitle>
          <CardDescription>
            Selecione a permissão de cada usuário para controlar o acesso às funcionalidades
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Carregando...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhum usuário encontrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Permissão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.image} />
                          <AvatarFallback className="bg-purple-500 text-white">
                            {getInitials(user.fullName || user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.fullName || user.name}</p>
                          {user.id === (session?.user as any)?.id && (
                            <Badge variant="secondary" className="text-xs">Você</Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-500">{user.email}</TableCell>
                    <TableCell className="text-gray-500">
                      {format(new Date(user.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      {user.id === (session?.user as any)?.id ? (
                        <Badge className={roleBadgeColors[user.role]}>
                          {roleLabels[user.role]}
                        </Badge>
                      ) : (
                        <Select
                          value={user.role}
                          onValueChange={(value) => handleRoleChange(user.id, value as UserRole)}
                          disabled={updating === user.id}
                        >
                          <SelectTrigger className="w-[160px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(roleLabels) as UserRole[]).map((role) => (
                              <SelectItem key={role} value={role}>
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-2 h-2 rounded-full"
                                    style={{
                                      backgroundColor:
                                        role === 'ADMIN'
                                          ? '#ef4444'
                                          : role === 'MANAGER'
                                          ? '#3b82f6'
                                          : role === 'USER'
                                          ? '#22c55e'
                                          : '#eab308',
                                    }}
                                  />
                                  {roleLabels[role]}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Warning */}
      <Card className="border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-900/10">
        <CardContent className="flex items-start gap-4 pt-6">
          <AlertTriangle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-800 dark:text-yellow-200">
              Atenção ao alterar permissões
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              Alterar as permissões de um usuário afeta imediatamente o que ele pode acessar no sistema.
              Certifique-se de que a permissão escolhida é adequada para as funções do colaborador.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
