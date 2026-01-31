export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/db';

// PATCH /api/sessions/[id]/complete - Mark session as completed
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspace = await getUserWorkspace((session.user as any).id);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    const { id } = params;

    // Verify session belongs to workspace
    const procedureSession = await prisma.procedureSession.findFirst({
      where: {
        id,
        sale: {
          workspaceId: workspace.id,
        },
      },
    });

    if (!procedureSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Update session to completed
    const updatedSession = await prisma.procedureSession.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedDate: new Date(),
      },
    });

    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error('Error completing session:', error);
    return NextResponse.json(
      { error: 'Failed to complete session' },
      { status: 500 }
    );
  }
}
