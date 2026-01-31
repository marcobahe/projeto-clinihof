'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DollarSign, Users, TrendingUp, Filter, Download, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface Commission {
  id: string;
  saleDate: string;
  patientName: string;
  saleValue: number;
  sellerId: string;
  sellerName: string;
  commissionType: 'PERCENTAGE' | 'FIXED';
  commissionRate: number;
  commissionAmount: number;
}

interface SellerTotal {
  name: string;
  totalSales: number;
  totalCommission: number;
  salesCount: number;
}

interface Collaborator {
  id: string;
  name: string;
}

export default function ComissoesPage() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [sellerTotals, setSellerTotals] = useState<SellerTotal[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ totalSalesValue: 0, totalCommission: 0, salesCount: 0 });
  
  // Filters
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [selectedSeller, setSelectedSeller] = useState<string>('');

  const fetchCommissions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (selectedSeller && selectedSeller !== 'all') params.append('sellerId', selectedSeller);

      const response = await fetch(`/api/commissions?${params}`);
      if (!response.ok) throw new Error('Erro ao carregar comissões');

      const data = await response.json();
      setCommissions(data.commissions || []);
      setSellerTotals(data.sellerTotals || []);
      setSummary(data.summary || { totalSalesValue: 0, totalCommission: 0, salesCount: 0 });
      setCollaborators(data.collaborators || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao carregar comissões');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommissions();
  }, [startDate, endDate, selectedSeller]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleQuickPeriod = (months: number) => {
    const targetDate = months === 0 ? new Date() : subMonths(new Date(), months);
    setStartDate(format(startOfMonth(targetDate), 'yyyy-MM-dd'));
    setEndDate(format(endOfMonth(targetDate), 'yyyy-MM-dd'));
  };

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">Comissões</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Relatório de comissões dos vendedores
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Data Início</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Vendedor</Label>
              <Select value={selectedSeller} onValueChange={setSelectedSeller}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os vendedores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os vendedores</SelectItem>
                  {collaborators.map((collab) => (
                    <SelectItem key={collab.id} value={collab.id}>
                      {collab.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button variant="outline" size="sm" onClick={() => handleQuickPeriod(0)}>
                Este mês
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleQuickPeriod(1)}>
                Mês anterior
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-purple-600 to-purple-700 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-100">Total em Vendas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(summary.totalSalesValue)}</div>
            <p className="text-purple-200 text-sm mt-1">{summary.salesCount} vendas no período</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-600 to-green-700 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-100">Total Comissões</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(summary.totalCommission)}</div>
            <p className="text-green-200 text-sm mt-1">A pagar aos vendedores</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-100">Taxa Média</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {summary.totalSalesValue > 0
                ? ((summary.totalCommission / summary.totalSalesValue) * 100).toFixed(1)
                : 0}%
            </div>
            <p className="text-blue-200 text-sm mt-1">Comissão média</p>
          </CardContent>
        </Card>
      </div>

      {/* Totals by Seller */}
      {sellerTotals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Resumo por Vendedor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendedor</TableHead>
                  <TableHead className="text-right">Vendas</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead className="text-right">Comissão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sellerTotals.map((seller, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{seller.name}</TableCell>
                    <TableCell className="text-right">{seller.salesCount}</TableCell>
                    <TableCell className="text-right">{formatCurrency(seller.totalSales)}</TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      {formatCurrency(seller.totalCommission)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Detailed Commissions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Detalhamento das Comissões
          </CardTitle>
          <CardDescription>
            Lista detalhada de todas as comissões no período
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Carregando...</div>
          ) : commissions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhuma comissão encontrada no período selecionado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead className="text-right">Valor Venda</TableHead>
                  <TableHead className="text-center">Taxa</TableHead>
                  <TableHead className="text-right">Comissão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.map((commission) => (
                  <TableRow key={commission.id}>
                    <TableCell>
                      {format(new Date(commission.saleDate), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>{commission.patientName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {commission.sellerName}
                        <Badge variant="outline" className="text-xs">
                          {commission.commissionType === 'PERCENTAGE' ? '%' : 'R$'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(commission.saleValue)}
                    </TableCell>
                    <TableCell className="text-center">
                      {commission.commissionType === 'PERCENTAGE'
                        ? `${commission.commissionRate}%`
                        : formatCurrency(commission.commissionRate)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      {formatCurrency(commission.commissionAmount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
