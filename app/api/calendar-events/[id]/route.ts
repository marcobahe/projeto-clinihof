import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/db';

// PUT /api/calendar-events/[id] - Atualiza um evento
export async function PUT(
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

    const { id } = params;
    const body = await req.json();
    const { title, description, startDate, endDate, tagId } = body;

    if (!title || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Título, data de início e data de fim são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se o evento pertence ao workspace
    const existingEvent = await prisma.calendarEvent.findFirst({
      where: { id, workspaceId: workspace.id },
    });

    if (!existingEvent) {
      return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 });
    }

    // Validar tag se fornecida
    if (tagId) {
      const tag = await prisma.tag.findFirst({
        where: { id: tagId, workspaceId: workspace.id },
      });
      if (!tag) {
        return NextResponse.json({ error: 'Tag não encontrada' }, { status: 404 });
      }
    }

    const event = await prisma.calendarEvent.update({
      where: { id },
      data: {
        title,
        description: description || null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        tagId: tagId || null,
      },
      include: {
        tag: true,
        createdBy: {
          select: { id: true, fullName: true },
        },
      },
    });

    return NextResponse.json(event);
  } catch (error) {
    console.error('Error updating calendar event:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar evento' },
      { status: 500 }
    );
  }
}

// DELETE /api/calendar-events/[id] - Deleta um evento
export async function DELETE(
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

    const { id } = params;

    // Verificar se o evento pertence ao workspace
    const existingEvent = await prisma.calendarEvent.findFirst({
      where: { id, workspaceId: workspace.id },
    });

    if (!existingEvent) {
      return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 });
    }

    await prisma.calendarEvent.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Evento deletado com sucesso' });
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    return NextResponse.json(
      { error: 'Erro ao deletar evento' },
      { status: 500 }
    );
  }
}
