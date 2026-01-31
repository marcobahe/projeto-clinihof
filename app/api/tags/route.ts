import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/tags - Lista todas as tags do workspace
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

    const tags = await prisma.tag.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { events: true },
        },
      },
    });

    return NextResponse.json(tags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar tags' },
      { status: 500 }
    );
  }
}

// POST /api/tags - Cria uma nova tag
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
    const { name, color } = body;

    if (!name || !color) {
      return NextResponse.json(
        { error: 'Nome e cor são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se já existe tag com mesmo nome no workspace
    const existingTag = await prisma.tag.findUnique({
      where: {
        workspaceId_name: {
          workspaceId: workspace.id,
          name,
        },
      },
    });

    if (existingTag) {
      return NextResponse.json(
        { error: 'Já existe uma tag com este nome' },
        { status: 409 }
      );
    }

    const tag = await prisma.tag.create({
      data: {
        name,
        color,
        workspaceId: workspace.id,
      },
    });

    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    console.error('Error creating tag:', error);
    return NextResponse.json(
      { error: 'Erro ao criar tag' },
      { status: 500 }
    );
  }
}
