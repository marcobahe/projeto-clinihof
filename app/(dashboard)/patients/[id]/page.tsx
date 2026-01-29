import { getServerSession } from 'next-auth';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getUserWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Mail, Phone, Calendar, FileText } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PatientDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  const workspace = await getUserWorkspace((session.user as any).id);

  if (!workspace) {
    redirect('/dashboard');
  }

  const patient = await prisma.patient.findFirst({
    where: {
      id,
      workspaceId: workspace.id,
    },
    include: {
      sales: {
        include: {
          items: {
            include: {
              procedure: true,
            },
          },
          _count: {
            select: {
              sessions: true,
            },
          },
        },
        orderBy: {
          saleDate: 'desc',
        },
      },
    },
  });

  if (!patient) {
    redirect('/patients');
  }

  const paymentMethodLabels: Record<string, string> = {
    CASH_PIX: 'Dinheiro/Pix',
    CREDIT_CARD: 'Cartão Crédito',
    DEBIT_CARD: 'Cartão Débito',
    BANK_SLIP: 'Boleto',
  };

  const paymentStatusLabels: Record<string, string> = {
    PENDING: 'Pendente',
    PARTIAL: 'Parcial',
    PAID: 'Pago',
    OVERDUE: 'Atrasado',
  };

  const paymentStatusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    PARTIAL: 'bg-blue-100 text-blue-800',
    PAID: 'bg-green-100 text-green-800',
    OVERDUE: 'bg-red-100 text-red-800',
  };

  return (
    <div>
      <div className="mb-6">
        <Link href="/patients">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Detalhes do Paciente</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-purple-600" />
                Informações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm font-medium text-gray-500">Nome</div>
                <div className="text-lg font-semibold">{patient.name}</div>
              </div>
              {patient.email && (
                <div>
                  <div className="text-sm font-medium text-gray-500 flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    E-mail
                  </div>
                  <div className="text-sm">{patient.email}</div>
                </div>
              )}
              <div>
                <div className="text-sm font-medium text-gray-500 flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  Telefone/WhatsApp
                </div>
                <div className="text-sm">{patient.phone}</div>
              </div>
              {patient.notes && (
                <div>
                  <div className="text-sm font-medium text-gray-500 flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    Observações
                  </div>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">
                    {patient.notes}
                  </div>
                </div>
              )}
              <div>
                <div className="text-sm font-medium text-gray-500 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Cadastrado em
                </div>
                <div className="text-sm">
                  {new Date(patient.createdAt).toLocaleDateString('pt-BR')}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                Histórico de Vendas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {patient.sales.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Nenhuma venda registrada
                </p>
              ) : (
                <div className="space-y-4">
                  {patient.sales.map((sale) => {
                    const completedSessions = sale._count.sessions;
                    return (
                      <div
                        key={sale.id}
                        className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-semibold">
                              {new Date(sale.saleDate).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric',
                              })}
                            </div>
                            <div className="text-sm text-gray-600">
                              {sale.paymentMethod ? paymentMethodLabels[sale.paymentMethod] : 'Split de pagamentos'} • {sale.installments || 1}x
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-purple-600 text-lg">
                              {formatCurrency(sale.totalAmount)}
                            </div>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                paymentStatusColors[sale.paymentStatus] ?? 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {paymentStatusLabels[sale.paymentStatus] ?? sale.paymentStatus}
                            </span>
                          </div>
                        </div>
                        <div className="text-sm">
                          <div className="font-medium text-gray-700 mb-1">Procedimentos:</div>
                          <ul className="list-disc list-inside text-gray-600">
                            {sale.items.map((item) => (
                              <li key={item.id}>
                                {item.procedure.name} - {item.quantity}x sess{item.quantity > 1 ? 'ões' : 'ão'}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="mt-3">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">Sessões</span>
                            <span className="font-medium">{completedSessions} total</span>
                          </div>
                        </div>
                        {sale.notes && (
                          <div className="mt-2 text-sm text-gray-600 italic">
                            {sale.notes}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
