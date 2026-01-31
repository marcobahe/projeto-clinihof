import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getUserWorkspace } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

// PATCH /api/procedures/[id]/color - Update procedure color
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const workspace = await getUserWorkspace((session.user as any).id);

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
    }

    const { id } = await params;
    const body = await req.json();
    const { color } = body;

    // Verify procedure belongs to workspace
    const procedure = await prisma.procedure.findFirst({
      where: {
        id,
        workspaceId: workspace.id,
      },
    });

    if (!procedure) {
      return NextResponse.json(
        { error: 'Procedimento não encontrado' },
        { status: 404 }
      );
    }

    // Update color
    const updated = await prisma.procedure.update({
      where: { id },
      data: { color },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update procedure color error:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar cor do procedimento' },
      { status: 500 }
    );
  }
}
