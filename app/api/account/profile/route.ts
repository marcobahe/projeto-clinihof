import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getUserWorkspace } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
      select: {
        id: true,
        fullName: true,
        email: true,
        image: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const workspace = await getUserWorkspace((session.user as any).id);

    return NextResponse.json({
      ...user,
      clinicName: workspace?.name || '',
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json({ error: 'Erro ao buscar perfil' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { fullName, clinicName } = body;

    if (!fullName || !clinicName) {
      return NextResponse.json(
        { error: 'Nome completo e nome da clínica são obrigatórios' },
        { status: 400 }
      );
    }

    // Update user and workspace in transaction
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: (session.user as any).id },
        data: {
          fullName,
          name: fullName,
        },
      });

      const workspace = await getUserWorkspace((session.user as any).id);
      if (workspace) {
        await tx.workspace.update({
          where: { id: workspace.id },
          data: { name: clinicName },
        });
      }
    });

    return NextResponse.json({ message: 'Perfil atualizado com sucesso' });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'Erro ao atualizar perfil' }, { status: 500 });
  }
}
