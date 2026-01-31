import { google, calendar_v3 } from 'googleapis';
import { prisma } from './db';

// Initialize Google Calendar API client
export function getGoogleCalendarClient(accessToken: string, refreshToken?: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

// Create a Google Calendar event from a ProcedureSession
export async function createGoogleCalendarEvent(
  calendar: calendar_v3.Calendar,
  calendarId: string,
  session: {
    id: string;
    scheduledDate: Date;
    notes?: string | null;
    procedure: { name: string; duration: number };
    sale: { patient: { name: string; phone: string; email?: string | null } };
  }
) {
  const startTime = new Date(session.scheduledDate);
  const endTime = new Date(startTime.getTime() + session.procedure.duration * 60000);

  const event: calendar_v3.Schema$Event = {
    summary: `${session.procedure.name} - ${session.sale.patient.name}`,
    description: `Paciente: ${session.sale.patient.name}
Telefone: ${session.sale.patient.phone}
Procedimento: ${session.procedure.name}
Duração: ${session.procedure.duration} minutos
${session.notes ? `\nObservações: ${session.notes}` : ''}

Agendamento CliniHOF - ID: ${session.id}`,
    start: {
      dateTime: startTime.toISOString(),
      timeZone: 'America/Sao_Paulo',
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: 'America/Sao_Paulo',
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 60 },
        { method: 'popup', minutes: 15 },
      ],
    },
    // Extended properties for tracking
    extendedProperties: {
      private: {
        clinihofSessionId: session.id,
        source: 'clinihof',
      },
    },
  };

  // Add patient email as attendee if available
  if (session.sale.patient.email) {
    event.attendees = [{ email: session.sale.patient.email }];
  }

  try {
    const response = await calendar.events.insert({
      calendarId,
      requestBody: event,
    });

    return response.data;
  } catch (error) {
    console.error('Error creating Google Calendar event:', error);
    throw error;
  }
}

// Update a Google Calendar event
export async function updateGoogleCalendarEvent(
  calendar: calendar_v3.Calendar,
  calendarId: string,
  eventId: string,
  session: {
    id: string;
    scheduledDate: Date;
    notes?: string | null;
    procedure: { name: string; duration: number };
    sale: { patient: { name: string; phone: string; email?: string | null } };
  }
) {
  const startTime = new Date(session.scheduledDate);
  const endTime = new Date(startTime.getTime() + session.procedure.duration * 60000);

  const event: calendar_v3.Schema$Event = {
    summary: `${session.procedure.name} - ${session.sale.patient.name}`,
    description: `Paciente: ${session.sale.patient.name}
Telefone: ${session.sale.patient.phone}
Procedimento: ${session.procedure.name}
Duração: ${session.procedure.duration} minutos
${session.notes ? `\nObservações: ${session.notes}` : ''}

Agendamento CliniHOF - ID: ${session.id}`,
    start: {
      dateTime: startTime.toISOString(),
      timeZone: 'America/Sao_Paulo',
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: 'America/Sao_Paulo',
    },
  };

  if (session.sale.patient.email) {
    event.attendees = [{ email: session.sale.patient.email }];
  }

  try {
    const response = await calendar.events.update({
      calendarId,
      eventId,
      requestBody: event,
    });

    return response.data;
  } catch (error) {
    console.error('Error updating Google Calendar event:', error);
    throw error;
  }
}

// Delete a Google Calendar event
export async function deleteGoogleCalendarEvent(
  calendar: calendar_v3.Calendar,
  calendarId: string,
  eventId: string
) {
  try {
    await calendar.events.delete({
      calendarId,
      eventId,
    });
    return true;
  } catch (error) {
    console.error('Error deleting Google Calendar event:', error);
    throw error;
  }
}

// Sync CliniHOF session to Google Calendar
export async function syncSessionToGoogleCalendar(
  userId: string,
  sessionId: string,
  action: 'create' | 'update' | 'delete'
) {
  // Get user's Google account
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: 'google',
    },
  });

  if (!account?.access_token) {
    console.log('No Google account linked for user');
    return null;
  }

  // Get workspace settings
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      workspace: true,
    },
  });

  const workspace = user?.workspace;
  if (!workspace) {
    return null;
  }

  const settings = await prisma.workspaceSettings.findUnique({
    where: { workspaceId: workspace.id },
  });

  if (!settings?.googleCalendarEnabled || !settings?.googleCalendarId) {
    console.log('Google Calendar sync not enabled');
    return null;
  }

  const calendar = getGoogleCalendarClient(account.access_token, account.refresh_token || undefined);

  // Get the session with all needed data
  const session = await prisma.procedureSession.findUnique({
    where: { id: sessionId },
    include: {
      procedure: true,
      sale: {
        include: {
          patient: true,
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  try {
    if (action === 'delete' && session.googleEventId) {
      await deleteGoogleCalendarEvent(calendar, settings.googleCalendarId, session.googleEventId);
      await prisma.procedureSession.update({
        where: { id: sessionId },
        data: { googleEventId: null },
      });
      return { success: true, action: 'deleted' };
    }

    if (action === 'update' && session.googleEventId && session.scheduledDate) {
      const event = await updateGoogleCalendarEvent(
        calendar,
        settings.googleCalendarId,
        session.googleEventId,
        {
          ...session,
          scheduledDate: session.scheduledDate,
        }
      );
      return { success: true, action: 'updated', eventId: event.id };
    }

    if (action === 'create' && session.scheduledDate && !session.googleEventId) {
      const event = await createGoogleCalendarEvent(
        calendar,
        settings.googleCalendarId,
        {
          ...session,
          scheduledDate: session.scheduledDate,
        }
      );

      if (event.id) {
        await prisma.procedureSession.update({
          where: { id: sessionId },
          data: { googleEventId: event.id },
        });
      }

      return { success: true, action: 'created', eventId: event.id };
    }

    return null;
  } catch (error) {
    console.error('Error syncing to Google Calendar:', error);
    return { success: false, error };
  }
}

// Fetch events from Google Calendar and sync to CliniHOF
export async function syncFromGoogleCalendar(
  userId: string,
  workspaceId: string,
  startDate: Date,
  endDate: Date
) {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: 'google',
    },
  });

  if (!account?.access_token) {
    return { success: false, error: 'No Google account linked' };
  }

  const settings = await prisma.workspaceSettings.findUnique({
    where: { workspaceId },
  });

  if (!settings?.googleCalendarEnabled || !settings?.googleCalendarId) {
    return { success: false, error: 'Google Calendar sync not enabled' };
  }

  const calendar = getGoogleCalendarClient(account.access_token, account.refresh_token || undefined);

  try {
    const response = await calendar.events.list({
      calendarId: settings.googleCalendarId,
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];
    const syncResults = [];

    for (const event of events) {
      // Check if this event is from CliniHOF
      const clinihofSessionId = event.extendedProperties?.private?.clinihofSessionId;
      
      if (clinihofSessionId) {
        // This is a CliniHOF event, check if it was updated
        const session = await prisma.procedureSession.findUnique({
          where: { id: clinihofSessionId },
        });

        if (session && event.start?.dateTime) {
          const googleStartTime = new Date(event.start.dateTime);
          const sessionTime = session.scheduledDate;

          // If times differ, update CliniHOF session
          if (sessionTime && googleStartTime.getTime() !== sessionTime.getTime()) {
            await prisma.procedureSession.update({
              where: { id: clinihofSessionId },
              data: { scheduledDate: googleStartTime },
            });
            syncResults.push({ eventId: event.id, action: 'updated', sessionId: clinihofSessionId });
          }
        }
      }
    }

    // Update last sync time
    await prisma.workspaceSettings.update({
      where: { workspaceId },
      data: { lastGoogleSync: new Date() },
    });

    return { success: true, synced: syncResults.length, results: syncResults };
  } catch (error) {
    console.error('Error syncing from Google Calendar:', error);
    return { success: false, error };
  }
}
