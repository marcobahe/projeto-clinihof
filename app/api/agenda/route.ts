import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/db';
import { SessionStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/agenda - Lista agendamentos com filtros de data
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const workspace = await getUserWorkspace((session.user as any).id);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const view = searchParams.get('view') || 'month'; // 'day', 'week', 'month'

    // Construir filtro de data
    const dateFilter: any = {
      scheduledDate: {
        not: null,
      },
    };

    if (startDate) {
      dateFilter.scheduledDate.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.scheduledDate.lte = new Date(endDate);
    }

    // Buscar agendamentos
    const appointments = await prisma.procedureSession.findMany({
      where: {
        sale: {
          workspaceId: workspace.id,
        },
        ...dateFilter,
      },
      include: {
        procedure: true,
        sale: {
          include: {
            patient: true,
          },
        },
      },
      orderBy: {
        scheduledDate: 'asc',
      },
    });

    return NextResponse.json({ appointments });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar agendamentos' },
      { status: 500 }
    );
  }
}

// PATCH /api/agenda - Atualiza um agendamento
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const workspace = await getUserWorkspace((session.user as any).id);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
    }

    const body = await req.json();
    const { sessionId, scheduledDate, status, appointmentType, notes } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'ID da sessão é obrigatório' }, { status: 400 });
    }

    // Verificar se a sessão pertence ao workspace
    const existingSession = await prisma.procedureSession.findFirst({
      where: {
        id: sessionId,
        sale: {
          workspaceId: workspace.id,
        },
      },
    });

    if (!existingSession) {
      return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 });
    }

    // Preparar dados para atualização
    const updateData: any = {};

    if (scheduledDate !== undefined) {
      updateData.scheduledDate = scheduledDate ? new Date(scheduledDate) : null;
    }

    if (status !== undefined) {
      updateData.status = status;
      // Se marcar como concluído, adicionar data de conclusão
      if (status === SessionStatus.COMPLETED && !existingSession.completedDate) {
        updateData.completedDate = new Date();
      }
    }

    if (appointmentType !== undefined) {
      updateData.appointmentType = appointmentType;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    // Atualizar sessão
    const updatedSession = await prisma.procedureSession.update({
      where: { id: sessionId },
      data: updateData,
      include: {
        procedure: true,
        sale: {
          include: {
            patient: true,
          },
        },
      },
    });

    return NextResponse.json({ session: updatedSession });
  } catch (error) {
    console.error('Error updating appointment:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar agendamento' },
      { status: 500 }
    );
  }
}
