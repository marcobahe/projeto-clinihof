'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, User, Mail, Loader2, Edit, Trash2, UserCheck, Shield, Users, Key } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { canManageTeam } from '@/lib/permissions';
import { useRequirePermission } from '@/hooks/use-permissions';
import { UserRole } from '@prisma/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TeamMember {
  id: string;
  name: string;
  fullName: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

interface InviteForm {
  email: string;
  name: string;
  role: UserRole;
}

export default function TeamPage() {
  const { data: session } = useSession() || {};
  const { hasAccess, canWrite: canManage, isLoading: permissionLoading } = useRequirePermission('team');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [inviteForm, setInviteForm] = useState<InviteForm>({
    email: '',
    name: '',
    role: 'USER'
  });
  const [isInviting, setIsInviting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [resetingUserId, setResetingUserId] = useState<string | null>(null);

  const fetchMembers = async () => {
    try {
      const response = await fetch('/api/team');
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members);
      } else {
        throw new Error('Failed to fetch members');
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar membros da equipe',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleInvite = async () => {
    if (!inviteForm.email || !inviteForm.name || !inviteForm.role) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos',
        variant: 'destructive',
      });
      return;
    }

    setIsInviting(true);
    try {
      const response = await fetch('/api/team', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inviteForm),
      });

      if (response.ok) {
        toast({
          title: 'Sucesso',
          description: 'Membro convidado com sucesso',
        });
        setIsInviteDialogOpen(false);
        setInviteForm({ email: '', name: '', role: 'USER' });
        fetchMembers();
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao convidar membro',
        variant: 'destructive',
      });
    } finally {
      setIsInviting(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!editingMember) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/team/${editingMember.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: editingMember.role }),
      });

      if (response.ok) {
        toast({
          title: 'Sucesso',
          description: 'Função atualizada com sucesso',
        });
        setIsEditDialogOpen(false);
        setEditingMember(null);
        fetchMembers();
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao atualizar função',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Tem certeza que deseja remover ${memberName} da equipe?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/team/${memberId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Sucesso',
          description: 'Membro removido com sucesso',
        });
        fetchMembers();
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao remover membro',
        variant: 'destructive',
      });
    }
  };

  const handleResetPassword = async (memberId: string, memberName: string) => {
    try {
      setResetingUserId(memberId);
      const response = await fetch(`/api/team/${memberId}`, {
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
          description: `Senha temporária gerada para ${memberName}`,
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao resetar senha');
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao resetar senha',
        variant: 'destructive',
      });
    } finally {
      setResetingUserId(null);
    }
  };

  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadge = (role: UserRole) => {
    const roleConfig = {
      MASTER: { label: 'Master', variant: 'destructive' as const },
      ADMIN: { label: 'Admin', variant: 'default' as const },
      MANAGER: { label: 'Gerente', variant: 'secondary' as const },
      RECEPTIONIST: { label: 'Recepcionista', variant: 'outline' as const },
      USER: { label: 'Usuário', variant: 'outline' as const },
    };

    return roleConfig[role] || { label: role, variant: 'outline' as const };
  };

  const canInvite = session?.user?.email && canManageTeam((session.user as any).role as UserRole);
  const userRole = (session?.user as any)?.role as UserRole;

  if (isLoading || permissionLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Equipe</h1>
          <p className="text-muted-foreground">
            Gerencie os membros da sua clínica
          </p>
        </div>
        
        {canInvite && (
          <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Convidar Membro
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Convidar Novo Membro</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@exemplo.com"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input
                    id="name"
                    placeholder="Nome do usuário"
                    value={inviteForm.name}
                    onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="role">Função</Label>
                  <Select value={inviteForm.role} onValueChange={(value) => setInviteForm({ ...inviteForm, role: value as UserRole })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar função" />
                    </SelectTrigger>
                    <SelectContent>
                      {userRole === 'ADMIN' && (
                        <SelectItem value="MANAGER">Gerente</SelectItem>
                      )}
                      <SelectItem value="RECEPTIONIST">Recepcionista</SelectItem>
                      <SelectItem value="USER">Usuário</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleInvite} disabled={isInviting}>
                  {isInviting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Convidar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar membros..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Members List */}
      <div className="grid gap-4">
        {filteredMembers.map((member) => {
          const roleBadge = getRoleBadge(member.role);
          const canEditThisMember = canManageTeam(userRole, member.role);
          
          return (
            <Card key={member.id}>
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  
                  <div>
                    <h3 className="font-medium">{member.fullName}</h3>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span>{member.email}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <Badge variant={roleBadge.variant}>
                      {roleBadge.label}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      Adicionado {formatDistanceToNow(new Date(member.createdAt), { locale: ptBR, addSuffix: true })}
                    </p>
                  </div>
                  
                  {canEditThisMember && (
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResetPassword(member.id, member.fullName)}
                        disabled={resetingUserId === member.id}
                        title="Resetar senha"
                      >
                        <Key className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingMember(member);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveMember(member.id, member.fullName)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        
        {filteredMembers.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum membro encontrado</h3>
              <p className="text-muted-foreground text-center">
                {searchQuery
                  ? 'Nenhum membro corresponde à sua busca.'
                  : 'Convide membros para sua equipe.'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Role Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Função</DialogTitle>
          </DialogHeader>
          
          {editingMember && (
            <div className="space-y-4">
              <div>
                <Label>Membro</Label>
                <p className="text-sm text-muted-foreground">{editingMember.fullName} ({editingMember.email})</p>
              </div>
              
              <div>
                <Label htmlFor="editRole">Nova Função</Label>
                <Select 
                  value={editingMember.role} 
                  onValueChange={(value) => setEditingMember({ ...editingMember, role: value as UserRole })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar função" />
                  </SelectTrigger>
                  <SelectContent>
                    {userRole === 'ADMIN' && (
                      <SelectItem value="MANAGER">Gerente</SelectItem>
                    )}
                    <SelectItem value="RECEPTIONIST">Recepcionista</SelectItem>
                    <SelectItem value="USER">Usuário</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateRole} disabled={isUpdating}>
              {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Atualizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Key className="h-5 w-5 mr-2 text-green-600" />
              Senha Temporária Gerada
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              A senha foi resetada com sucesso. Compartilhe essa senha temporária com o usuário:
            </p>
            <div className="flex items-center justify-center">
              <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                <span className="text-lg font-mono font-bold text-purple-600 dark:text-purple-400">
                  {tempPassword}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              O usuário deve alterar esta senha no primeiro login.
            </p>
          </div>
          <DialogFooter className="flex justify-center space-x-2">
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
            <Button size="sm" variant="outline" onClick={() => setResetDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}