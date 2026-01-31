'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, Crown, Mail, Loader2, Trash2, Shield, UserX, UserPlus } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface MasterAdmin {
  id: string;
  name: string;
  fullName: string;
  email: string;
  role: 'MASTER';
  createdAt: string;
}

interface AdminForm {
  email: string;
  name: string;
  isNewUser: boolean;
}

export default function AdminsPage() {
  const { data: session } = useSession() || {};
  const [admins, setAdmins] = useState<MasterAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [adminForm, setAdminForm] = useState<AdminForm>({
    email: '',
    name: '',
    isNewUser: false
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchAdmins = async () => {
    try {
      const response = await fetch('/api/master/admins');
      if (response.ok) {
        const data = await response.json();
        setAdmins(data.masters);
      } else {
        throw new Error('Failed to fetch admins');
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar administradores',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleAddAdmin = async () => {
    if (!adminForm.email || (adminForm.isNewUser && !adminForm.name)) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/master/admins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(adminForm),
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: 'Sucesso',
          description: data.message,
        });
        setIsDialogOpen(false);
        setAdminForm({ email: '', name: '', isNewUser: false });
        fetchAdmins();
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao adicionar administrador',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRevokeAccess = async (adminId: string, adminName: string) => {
    if (!confirm(`Tem certeza que deseja revogar o acesso MASTER de ${adminName}? Esta ação irá rebaixá-lo para ADMIN.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/master/admins/${adminId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: 'Sucesso',
          description: data.message,
        });
        fetchAdmins();
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao revogar acesso',
        variant: 'destructive',
      });
    }
  };

  const filteredAdmins = admins.filter(admin =>
    admin.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    admin.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentUserId = session?.user?.id;

  if (isLoading) {
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
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Crown className="h-6 w-6 text-yellow-500" />
            Administradores da Plataforma
          </h1>
          <p className="text-muted-foreground">
            Gerencie os usuários com acesso MASTER ao sistema
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Administrador
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Administrador MASTER</DialogTitle>
            </DialogHeader>
            
            <Tabs 
              value={adminForm.isNewUser ? 'new' : 'existing'} 
              onValueChange={(value) => setAdminForm({ ...adminForm, isNewUser: value === 'new' })}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="existing" className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Promover Existente
                </TabsTrigger>
                <TabsTrigger value="new" className="flex items-center gap-2">
                  <UserX className="h-4 w-4" />
                  Criar Novo
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="existing" className="space-y-4">
                <div>
                  <Label htmlFor="existingEmail">Email do Usuário</Label>
                  <Input
                    id="existingEmail"
                    type="email"
                    placeholder="usuario@exemplo.com"
                    value={adminForm.email}
                    onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Promove um usuário existente para MASTER
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="new" className="space-y-4">
                <div>
                  <Label htmlFor="newEmail">Email</Label>
                  <Input
                    id="newEmail"
                    type="email"
                    placeholder="novo-admin@exemplo.com"
                    value={adminForm.email}
                    onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="newName">Nome Completo</Label>
                  <Input
                    id="newName"
                    placeholder="Nome do administrador"
                    value={adminForm.name}
                    onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Senha temporária: <strong>Master@123</strong>
                  </p>
                </div>
              </TabsContent>
            </Tabs>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddAdmin} disabled={isProcessing}>
                {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {adminForm.isNewUser ? 'Criar' : 'Promover'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Administradores</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{admins.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Acesso Ativo</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{admins.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sua Conta</CardTitle>
            <Crown className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">MASTER</div>
            <p className="text-xs text-muted-foreground">Acesso Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar administradores..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Admins Table */}
      <Card>
        <CardHeader>
          <CardTitle>Administradores MASTER</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Adicionado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAdmins.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Crown className="h-4 w-4 text-yellow-500" />
                      <span className="font-medium">{admin.fullName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">{admin.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="destructive">
                      MASTER
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(admin.createdAt), { locale: ptBR, addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-right">
                    {admin.id !== currentUserId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRevokeAccess(admin.id, admin.fullName)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Revogar
                      </Button>
                    )}
                    {admin.id === currentUserId && (
                      <Badge variant="outline" className="text-xs">
                        Você
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              
              {filteredAdmins.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Crown className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        {searchQuery
                          ? 'Nenhum administrador encontrado.'
                          : 'Nenhum administrador cadastrado.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}