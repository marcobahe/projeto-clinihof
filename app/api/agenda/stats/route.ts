import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/db';
import { SessionStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/agenda/stats - Estatísticas de comparecimento no mês
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

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Datas de início e fim são obrigatórias' },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Buscar todos os agendamentos do período
    const appointments = await prisma.procedureSession.findMany({
      where: {
        sale: {
          workspaceId: workspace.id,
        },
        scheduledDate: {
          gte: start,
          lte: end,
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
      orderBy: {
        scheduledDate: 'desc',
      },
    });

    // Agrupar por paciente
    const patientStats = new Map<string, {
      patientId: string;
      patientName: string;
      attended: number;
      missed: number;
      scheduled: number;
      totalSessions: number;
      appointments: any[];
    }>();

    appointments.forEach((appointment) => {
      const patientId = appointment.sale.patientId;
      const patientName = appointment.sale.patient.name;

      if (!patientStats.has(patientId)) {
        patientStats.set(patientId, {
          patientId,
          patientName,
          attended: 0,
          missed: 0,
          scheduled: 0,
          totalSessions: 0,
          appointments: [],
        });
      }

      const stats = patientStats.get(patientId)!;
      stats.totalSessions++;
      stats.appointments.push(appointment);

      // Contabilizar status
      if (appointment.status === SessionStatus.COMPLETED) {
        stats.attended++;
      } else if (appointment.status === SessionStatus.CANCELLED) {
        stats.missed++;
      } else if (appointment.status === SessionStatus.SCHEDULED) {
        stats.scheduled++;
      }
    });

    // Converter Map para array e separar em compareceram vs não compareceram
    const allPatients = Array.from(patientStats.values());

    // Pacientes que compareceram (pelo menos uma sessão concluída)
    const attendedPatients = allPatients.filter(p => p.attended > 0);

    // Pacientes que não compareceram (nenhuma sessão concluída, mas têm sessões agendadas ou canceladas)
    const missedPatients = allPatients.filter(p => p.attended === 0 && (p.missed > 0 || p.scheduled > 0));

    // Estatísticas gerais
    const totalAppointments = appointments.length;
    const completedAppointments = appointments.filter(a => a.status === SessionStatus.COMPLETED).length;
    const cancelledAppointments = appointments.filter(a => a.status === SessionStatus.CANCELLED).length;
    const scheduledAppointments = appointments.filter(a => a.status === SessionStatus.SCHEDULED).length;

    return NextResponse.json({
      overview: {
        total: totalAppointments,
        completed: completedAppointments,
        cancelled: cancelledAppointments,
        scheduled: scheduledAppointments,
        attendanceRate: totalAppointments > 0 
          ? Math.round((completedAppointments / totalAppointments) * 100) 
          : 0,
      },
      attendedPatients,
      missedPatients,
    });
  } catch (error) {
    console.error('Error fetching agenda stats:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar estatísticas' },
      { status: 500 }
    );
  }
}
