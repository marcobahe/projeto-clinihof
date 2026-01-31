import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getEffectiveWorkspace } from '@/lib/get-workspace-id';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const workspace = await getEffectiveWorkspace();

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
    }

    const patients = await prisma.patient.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(patients);
  } catch (error) {
    console.error('Get patients error:', error);
    return NextResponse.json({ error: 'Erro ao buscar pacientes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const workspace = await getEffectiveWorkspace();

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
    }

    const body = await req.json();
    const { name, email, phone, birthday, origin, notes } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { error: 'Nome e telefone são obrigatórios' },
        { status: 400 }
      );
    }

    // Check for duplicate patient
    const existingPatient = await prisma.patient.findUnique({
      where: {
        workspaceId_name_phone: {
          workspaceId: workspace.id,
          name,
          phone,
        },
      },
    });

    if (existingPatient) {
      return NextResponse.json(
        { error: 'Já existe um paciente com este nome e telefone' },
        { status: 409 }
      );
    }

    const patient = await prisma.patient.create({
      data: {
        workspaceId: workspace.id,
        name,
        email: email || null,
        phone,
        birthday: birthday ? new Date(birthday) : null,
        origin: origin || null,
        notes: notes || null,
      },
    });

    return NextResponse.json(patient, { status: 201 });
  } catch (error) {
    console.error('Create patient error:', error);
    return NextResponse.json({ error: 'Erro ao criar paciente' }, { status: 500 });
  }
}
