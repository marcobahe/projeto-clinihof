import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/calendar-events - Lista eventos do calendário
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

    const where: any = {
      workspaceId: workspace.id,
    };

    if (startDate && endDate) {
      where.OR = [
        {
          startDate: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
        {
          endDate: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
        {
          AND: [
            { startDate: { lte: new Date(startDate) } },
            { endDate: { gte: new Date(endDate) } },
          ],
        },
      ];
    }

    const events = await prisma.calendarEvent.findMany({
      where,
      include: {
        tag: true,
        createdBy: {
          select: { id: true, fullName: true },
        },
      },
      orderBy: { startDate: 'asc' },
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar eventos' },
      { status: 500 }
    );
  }
}

// POST /api/calendar-events - Cria um novo evento
export async function POST(req: NextRequest) {
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
    const { title, description, startDate, endDate, tagId } = body;

    if (!title || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Título, data de início e data de fim são obrigatórios' },
        { status: 400 }
      );
    }

    // Validar que a tag pertence ao workspace (se fornecida)
    if (tagId) {
      const tag = await prisma.tag.findFirst({
        where: { id: tagId, workspaceId: workspace.id },
      });
      if (!tag) {
        return NextResponse.json(
          { error: 'Tag não encontrada' },
          { status: 404 }
        );
      }
    }

    const event = await prisma.calendarEvent.create({
      data: {
        title,
        description: description || null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        tagId: tagId || null,
        workspaceId: workspace.id,
        createdById: (session.user as any).id,
      },
      include: {
        tag: true,
        createdBy: {
          select: { id: true, fullName: true },
        },
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return NextResponse.json(
      { error: 'Erro ao criar evento' },
      { status: 500 }
    );
  }
}
