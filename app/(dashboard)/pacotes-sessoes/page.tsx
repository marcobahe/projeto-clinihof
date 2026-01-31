'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Package, 
  User, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Calendar,
  ChevronDown,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';

interface Session {
  id: string;
  scheduledDate: string | null;
  completedDate: string | null;
  status: 'PENDING' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  procedure: {
    id: string;
    name: string;
  };
}

interface PackageSale {
  id: string;
  saleDate: string;
  totalAmount: number;
  paymentStatus: string;
  patient: {
    id: string;
    name: string;
    phone: string;
  };
  package: {
    id: string;
    name: string;
    finalPrice: number;
  } | null;
  sessions: Session[];
  completedSessions: number;
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  SCHEDULED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const statusLabels: Record<string, string> = {
  PENDING: 'Pendente',
  SCHEDULED: 'Agendada',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
};

export default function PackageSessionsPage() {
  const [sales, setSales] = useState<PackageSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSales, setExpandedSales] = useState<Set<string>>(new Set());

  // Fetch package sales
  const fetchSales = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/sales');
      if (response.ok) {
        const data = await response.json();
        // Filter only sales with packages
        const packageSales = data.filter((sale: PackageSale) => sale.package !== null);
        setSales(packageSales);
      }
    } catch (error) {
      console.error('Error fetching sales:', error);
      toast.error('Erro ao carregar vendas de pacotes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  // Toggle sale expansion
  const toggleExpand = (saleId: string) => {
    const newExpanded = new Set(expandedSales);
    if (newExpanded.has(saleId)) {
      newExpanded.delete(saleId);
    } else {
      newExpanded.add(saleId);
    }
    setExpandedSales(newExpanded);
  };

  // Mark session as completed
  const handleCompleteSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/complete`, {
        method: 'POST',
      });

      if (response.ok) {
        toast.success('Sessão concluída com sucesso!');
        fetchSales();
      } else {
        throw new Error();
      }
    } catch (error) {
      toast.error('Erro ao concluir sessão');
    }
  };

  // Calculate statistics
  const stats = {
    totalPackages: sales.length,
    totalSessions: sales.reduce((sum, sale) => sum + sale.sessions.length, 0),
    completedSessions: sales.reduce((sum, sale) => sum + sale.completedSessions, 0),
    pendingSessions: sales.reduce((sum, sale) => {
      return sum + sale.sessions.filter(s => s.status === 'PENDING' || s.status === 'SCHEDULED').length;
    }, 0),
  };

  const progressPercentage = stats.totalSessions > 0 
    ? (stats.completedSessions / stats.totalSessions) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Sessões de Pacotes
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Acompanhe o progresso das sessões de cada pacote vendido
          </p>
        </div>
        <Button variant="outline" onClick={fetchSales}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-purple-600">{stats.totalPackages}</div>
                <p className="text-xs text-gray-500">Pacotes Vendidos</p>
              </div>
              <Package className="h-8 w-8 text-purple-300" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600">{stats.totalSessions}</div>
                <p className="text-xs text-gray-500">Total Sessões</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-300" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.completedSessions}</div>
                <p className="text-xs text-gray-500">Concluídas</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-300" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-yellow-600">{stats.pendingSessions}</div>
                <p className="text-xs text-gray-500">Pendentes</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-300" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Progresso Geral</CardTitle>
          <CardDescription>
            {stats.completedSessions} de {stats.totalSessions} sessões concluídas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={progressPercentage} className="h-3" />
          <div className="text-right text-sm text-gray-500 mt-1">
            {progressPercentage.toFixed(1)}%
          </div>
        </CardContent>
      </Card>

      {/* Package Sales List */}
      <Card>
        <CardHeader>
          <CardTitle>Vendas de Pacotes</CardTitle>
          <CardDescription>
            Clique em uma venda para ver as sessões
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              Carregando...
            </div>
          ) : sales.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhuma venda de pacote encontrada
            </div>
          ) : (
            <div className="space-y-4">
              {sales.map((sale) => {
                const isExpanded = expandedSales.has(sale.id);
                const completedCount = sale.completedSessions;
                const totalCount = sale.sessions.length;
                const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

                return (
                  <Collapsible
                    key={sale.id}
                    open={isExpanded}
                    onOpenChange={() => toggleExpand(sale.id)}
                  >
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <div className="flex items-center gap-4">
                            {isExpanded ? (
                              <ChevronDown className="h-5 w-5 text-gray-400" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-gray-400" />
                            )}
                            <div className="text-left">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-gray-400" />
                                <span className="font-medium">{sale.patient.name}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Package className="h-3 w-3" />
                                <span>{sale.package?.name}</span>
                                <span>•</span>
                                <span>{format(new Date(sale.saleDate), 'dd/MM/yyyy', { locale: ptBR })}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-sm font-medium">
                                {completedCount}/{totalCount} sessões
                              </div>
                              <Progress value={progress} className="h-2 w-24" />
                            </div>
                            <Badge className={progress === 100 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                              {progress.toFixed(0)}%
                            </Badge>
                          </div>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
                          <div className="grid gap-2">
                            {sale.sessions.map((session, index) => (
                              <div
                                key={session.id}
                                className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-xs font-medium text-purple-600">
                                    {index + 1}
                                  </div>
                                  <div>
                                    <div className="font-medium text-sm">{session.procedure.name}</div>
                                    <div className="text-xs text-gray-500">
                                      {session.scheduledDate
                                        ? `Agendada: ${format(new Date(session.scheduledDate), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`
                                        : 'Não agendada'}
                                      {session.completedDate && (
                                        <span className="ml-2 text-green-600">
                                          • Concluída: {format(new Date(session.completedDate), 'dd/MM/yyyy', { locale: ptBR })}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge className={statusColors[session.status]}>
                                    {statusLabels[session.status]}
                                  </Badge>
                                  {session.status !== 'COMPLETED' && session.status !== 'CANCELLED' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCompleteSession(session.id);
                                      }}
                                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                    >
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      Concluir
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
