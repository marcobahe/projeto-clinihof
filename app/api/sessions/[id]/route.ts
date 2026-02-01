import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getUserWorkspace } from '@/lib/workspace';
import { syncSessionToGoogleCalendar } from '@/lib/google-calendar';

export const dynamic = 'force-dynamic';

// PATCH - Update session (scheduledDate)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { scheduledDate, status, appointmentType } = body;

    // Verify session exists and belongs to user's workspace
    const existingSession = await prisma.procedureSession.findFirst({
      where: {
        id: params.id,
        sale: {
          workspaceId: workspace.id,
        },
      },
    });

    if (!existingSession) {
      return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 });
    }

    // Build update data object
    const updateData: any = {};
    
    if (scheduledDate !== undefined) {
      updateData.scheduledDate = scheduledDate ? new Date(scheduledDate) : null;
    }
    
    if (status !== undefined) {
      updateData.status = status;
      
      // Update scheduledDate based on new status
      if (status === 'SCHEDULED' && !existingSession.scheduledDate) {
        updateData.scheduledDate = new Date();
      }
    }

    if (appointmentType !== undefined) {
      updateData.appointmentType = appointmentType;
    }

    // Update session
    const updatedSession = await prisma.procedureSession.update({
      where: { id: params.id },
      data: updateData,
    });

    // Fire-and-forget: sync to Google Calendar
    // Determine action: if status changed to CANCELLED or scheduledDate removed, delete; otherwise update
    const syncAction = (status === 'CANCELLED' || (scheduledDate === null && !updatedSession.scheduledDate))
      ? 'delete' as const
      : (existingSession.googleEventId ? 'update' as const : 'create' as const);
    syncSessionToGoogleCalendar((session.user as any).id, params.id, syncAction)
      .catch((err) => console.error('[GoogleCalendar] Sync error (session update):', err));

    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar sessão' },
      { status: 500 }
    );
  }
}
