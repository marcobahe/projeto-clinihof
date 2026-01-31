import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

// PATCH /api/users/[id]/role - Update user role (admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
      select: { id: true, role: true },
    });

    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem alterar permissões.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { role } = body;

    // Validate role
    const validRoles: UserRole[] = ['ADMIN', 'MANAGER', 'USER', 'RECEPTIONIST'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Permissão inválida' },
        { status: 400 }
      );
    }

    // Prevent admin from changing their own role
    if (id === currentUser.id) {
      return NextResponse.json(
        { error: 'Você não pode alterar sua própria permissão' },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Update user role error:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar permissão do usuário' },
      { status: 500 }
    );
  }
}
