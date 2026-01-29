import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/sessions/pending - Get pending sessions queue
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspace = await getUserWorkspace((session.user as any).id);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    const pendingSessions = await prisma.procedureSession.findMany({
      where: {
        sale: {
          workspaceId: workspace.id,
        },
        status: 'PENDING',
      },
      include: {
        sale: {
          include: {
            patient: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
        procedure: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 50, // Limit to 50 pending sessions
    });

    return NextResponse.json(pendingSessions);
  } catch (error) {
    console.error('Error fetching pending sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending sessions' },
      { status: 500 }
    );
  }
}
