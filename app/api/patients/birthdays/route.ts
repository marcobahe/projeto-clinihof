import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getUserWorkspace } from '@/lib/workspace';
import { addDays, format, getMonth, getDate } from 'date-fns';

export const dynamic = 'force-dynamic';

// GET /api/patients/birthdays - Get upcoming birthdays (next 30 days)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const workspace = await getUserWorkspace((session.user as any).id);

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
    }

    const searchParams = req.nextUrl.searchParams;
    const daysAhead = parseInt(searchParams.get('days') || '30');

    // Get all patients with birthdays
    const patientsWithBirthday = await prisma.patient.findMany({
      where: {
        workspaceId: workspace.id,
        birthday: { not: null },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        birthday: true,
      },
    });

    const today = new Date();
    const currentYear = today.getFullYear();
    const todayMonth = getMonth(today);
    const todayDay = getDate(today);

    // Filter and sort patients whose birthday is within the next N days
    const upcomingBirthdays = patientsWithBirthday
      .map((patient) => {
        if (!patient.birthday) return null;

        const birthdayDate = new Date(patient.birthday);
        const birthMonth = getMonth(birthdayDate);
        const birthDay = getDate(birthdayDate);

        // Calculate this year's birthday
        let birthdayThisYear = new Date(currentYear, birthMonth, birthDay);

        // If birthday already passed this year, consider next year
        if (birthdayThisYear < today && !(
          birthMonth === todayMonth && birthDay === todayDay
        )) {
          birthdayThisYear = new Date(currentYear + 1, birthMonth, birthDay);
        }

        // Calculate days until birthday
        const diffTime = birthdayThisYear.getTime() - today.getTime();
        const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
          ...patient,
          birthdayThisYear: birthdayThisYear.toISOString(),
          daysUntil,
          formattedBirthday: format(birthdayThisYear, 'dd/MM'),
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null && p.daysUntil >= 0 && p.daysUntil <= daysAhead)
      .sort((a, b) => a.daysUntil - b.daysUntil);

    return NextResponse.json({
      birthdays: upcomingBirthdays,
      count: upcomingBirthdays.length,
    });
  } catch (error) {
    console.error('Get upcoming birthdays error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar aniversariantes' },
      { status: 500 }
    );
  }
}
