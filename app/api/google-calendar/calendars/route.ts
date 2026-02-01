import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getGoogleCalendarClient } from '@/lib/google-calendar';

export const dynamic = 'force-dynamic';

// GET /api/google-calendar/calendars - List user's Google calendars
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Get user's Google account
    const account = await prisma.account.findFirst({
      where: {
        userId,
        provider: 'google',
      },
    });

    if (!account?.access_token) {
      return NextResponse.json(
        { error: 'No Google account linked', calendars: [] },
        { status: 200 }
      );
    }

    const calendar = getGoogleCalendarClient(
      account.access_token,
      account.refresh_token || undefined
    );

    const response = await calendar.calendarList.list({
      minAccessRole: 'writer', // Only calendars user can write to
    });

    const calendars = (response.data.items || []).map((cal) => ({
      id: cal.id,
      summary: cal.summary,
      description: cal.description || null,
      primary: cal.primary || false,
      backgroundColor: cal.backgroundColor || null,
    }));

    return NextResponse.json({ calendars });
  } catch (error: any) {
    console.error('Error fetching Google calendars:', error);

    // Handle token expiry / invalid grant gracefully
    if (error?.code === 401 || error?.response?.status === 401) {
      return NextResponse.json(
        { error: 'Google token expired. Please reconnect your Google account.', calendars: [] },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch Google calendars', calendars: [] },
      { status: 200 }
    );
  }
}
