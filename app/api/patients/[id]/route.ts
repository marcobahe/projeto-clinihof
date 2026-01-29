import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getUserWorkspace } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const workspace = await getUserWorkspace((session.user as any).id);

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
    }

    const patient = await prisma.patient.findFirst({
      where: {
        id,
        workspaceId: workspace.id,
      },
    });

    if (!patient) {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 });
    }

    return NextResponse.json(patient);
  } catch (error) {
    console.error('Get patient error:', error);
    return NextResponse.json({ error: 'Erro ao buscar paciente' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const workspace = await getUserWorkspace((session.user as any).id);

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
    }

    const body = await req.json();
    const { name, email, phone, notes } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { error: 'Nome e telefone são obrigatórios' },
        { status: 400 }
      );
    }

    const patient = await prisma.patient.updateMany({
      where: {
        id,
        workspaceId: workspace.id,
      },
      data: {
        name,
        email: email || null,
        phone,
        notes: notes || null,
      },
    });

    if (patient.count === 0) {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Paciente atualizado com sucesso' });
  } catch (error) {
    console.error('Update patient error:', error);
    return NextResponse.json({ error: 'Erro ao atualizar paciente' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const workspace = await getUserWorkspace((session.user as any).id);

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
    }

    const patient = await prisma.patient.deleteMany({
      where: {
        id,
        workspaceId: workspace.id,
      },
    });

    if (patient.count === 0) {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Paciente excluído com sucesso' });
  } catch (error) {
    console.error('Delete patient error:', error);
    return NextResponse.json({ error: 'Erro ao excluir paciente' }, { status: 500 });
  }
}
