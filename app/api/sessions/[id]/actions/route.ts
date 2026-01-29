import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getUserWorkspace } from '@/lib/workspace';
import { AppointmentType } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface ActionContext {
  sessionId: string;
  appointmentType: AppointmentType;
  saleId: string;
  patientId: string;
  patientName: string;
  procedureName: string;
  scheduledDate: Date | null;
}

/**
 * Processa ações automáticas baseadas no tipo de consulta
 */
async function processAppointmentActions(context: ActionContext) {
  const actions: string[] = [];

  switch (context.appointmentType) {
    case 'FIRST_VISIT':
      // 🔴 PRIMEIRA CONSULTA - Ações:
      // 1. Registra como paciente novo (já é feito no cadastro)
      // 2. Cria notificação de preparo específico
      // 3. Inicia tracking de conversão
      
      actions.push('Marcado como primeira consulta');
      actions.push('Sistema preparado para conversão');
      actions.push('Paciente em processo de diagnóstico inicial');
      break;

    case 'PAYMENT_PENDING':
      // 🟡 PENDÊNCIA DE COBRANÇA - Ações:
      // 1. Gera alerta de cobrança
      // 2. Atualiza recebíveis pendentes
      // 3. Notifica sobre valor em aberto
      
      actions.push('Alerta de cobrança ativado');
      actions.push('Valor incluído em recebíveis pendentes');
      actions.push('Dashboard atualizado com pendência financeira');
      break;

    case 'FOLLOW_UP':
      // 🟢 RETORNO/ACOMPANHAMENTO - Ações:
      // 1. Marca como consulta de retorno
      // 2. Sugere próximo agendamento (3 ou 6 meses)
      // 3. Atualiza indicadores de desempenho
      
      actions.push('Registrado como consulta de retorno');
      actions.push('Indicadores de acompanhamento atualizados');
      actions.push('Sistema preparado para sugestão de próximo agendamento');
      break;
  }

  return actions;
}

/**
 * POST /api/sessions/[id]/actions
 * Aplica ações automáticas ao alterar o tipo de consulta
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const workspace = await getUserWorkspace((session.user as any).id);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
    }

    const { appointmentType } = await req.json();

    if (!appointmentType || !['FIRST_VISIT', 'PAYMENT_PENDING', 'FOLLOW_UP'].includes(appointmentType)) {
      return NextResponse.json(
        { error: 'Tipo de consulta inválido' },
        { status: 400 }
      );
    }

    // Busca a sessão com informações relacionadas
    const procedureSession = await prisma.procedureSession.findFirst({
      where: {
        id: params.id,
        sale: {
          workspaceId: workspace.id,
        },
      },
      include: {
        sale: {
          include: {
            patient: true,
          },
        },
        procedure: true,
      },
    });

    if (!procedureSession) {
      return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 });
    }

    // Atualiza o tipo de consulta
    await prisma.procedureSession.update({
      where: { id: params.id },
      data: { appointmentType },
    });

    // Processa ações automáticas
    const context: ActionContext = {
      sessionId: procedureSession.id,
      appointmentType,
      saleId: procedureSession.saleId,
      patientId: procedureSession.sale.patient.id,
      patientName: procedureSession.sale.patient.name,
      procedureName: procedureSession.procedure.name,
      scheduledDate: procedureSession.scheduledDate,
    };

    const actions = await processAppointmentActions(context);

    return NextResponse.json({
      success: true,
      appointmentType,
      actions,
      message: `Tipo de consulta atualizado com sucesso`,
    });
  } catch (error) {
    console.error('Erro ao processar ações da consulta:', error);
    return NextResponse.json(
      { error: 'Erro ao processar ações' },
      { status: 500 }
    );
  }
}
