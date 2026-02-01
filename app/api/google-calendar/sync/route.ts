import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/db';
import { syncSessionToGoogleCalendar, syncFromGoogleCalendar } from '@/lib/google-calendar';

export const dynamic = 'force-dynamic';

// POST /api/google-calendar/sync - Sync a specific session, all sessions, or pull from Google
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const workspace = await getUserWorkspace(userId);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    const body = await request.json();
    const { sessionId, action, syncAll } = body;

    // Pull events from Google Calendar into CliniHOF
    if (action === 'pull') {
      const startDate = body.startDate ? new Date(body.startDate) : new Date();
      const endDate = body.endDate
        ? new Date(body.endDate)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const result = await syncFromGoogleCalendar(userId, workspace.id, startDate, endDate);
      return NextResponse.json(result);
    }

    // Sync all sessions to Google Calendar
    if (syncAll) {
      const sessions = await prisma.procedureSession.findMany({
        where: {
          sale: { workspaceId: workspace.id },
          scheduledDate: { not: null },
          googleEventId: null,
        },
        include: {
          procedure: true,
          sale: { include: { patient: true } },
        },
      });

      const results = [];
      for (const sess of sessions) {
        const result = await syncSessionToGoogleCalendar(userId, sess.id, 'create');
        results.push({ sessionId: sess.id, result });
      }

      return NextResponse.json({ success: true, synced: results.length, results });
    }

    // Sync a specific session
    if (sessionId && action) {
      const result = await syncSessionToGoogleCalendar(userId, sessionId, action);
      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('Error syncing Google Calendar:', error);
    return NextResponse.json(
      { error: 'Failed to sync with Google Calendar' },
      { status: 500 }
    );
  }
}

// GET /api/google-calendar/sync - Pull events from Google Calendar
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const workspace = await getUserWorkspace(userId);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate') 
      ? new Date(searchParams.get('startDate')!) 
      : new Date();
    const endDate = searchParams.get('endDate') 
      ? new Date(searchParams.get('endDate')!) 
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days default

    const result = await syncFromGoogleCalendar(userId, workspace.id, startDate, endDate);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error pulling from Google Calendar:', error);
    return NextResponse.json(
      { error: 'Failed to pull from Google Calendar' },
      { status: 500 }
    );
  }
}
