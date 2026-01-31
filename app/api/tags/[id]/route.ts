import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/db';

// PUT /api/tags/[id] - Atualiza uma tag
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
    const { name, color } = body;

    if (!name || !color) {
      return NextResponse.json(
        { error: 'Nome e cor são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se a tag pertence ao workspace
    const existingTag = await prisma.tag.findFirst({
      where: { id, workspaceId: workspace.id },
    });

    if (!existingTag) {
      return NextResponse.json({ error: 'Tag não encontrada' }, { status: 404 });
    }

    // Verificar duplicidade de nome (excluindo a tag atual)
    const duplicateTag = await prisma.tag.findFirst({
      where: {
        workspaceId: workspace.id,
        name,
        id: { not: id },
      },
    });

    if (duplicateTag) {
      return NextResponse.json(
        { error: 'Já existe outra tag com este nome' },
        { status: 409 }
      );
    }

    const tag = await prisma.tag.update({
      where: { id },
      data: { name, color },
    });

    return NextResponse.json(tag);
  } catch (error) {
    console.error('Error updating tag:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar tag' },
      { status: 500 }
    );
  }
}

// DELETE /api/tags/[id] - Deleta uma tag
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

    // Verificar se a tag pertence ao workspace
    const existingTag = await prisma.tag.findFirst({
      where: { id, workspaceId: workspace.id },
    });

    if (!existingTag) {
      return NextResponse.json({ error: 'Tag não encontrada' }, { status: 404 });
    }

    await prisma.tag.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Tag deletada com sucesso' });
  } catch (error) {
    console.error('Error deleting tag:', error);
    return NextResponse.json(
      { error: 'Erro ao deletar tag' },
      { status: 500 }
    );
  }
}
