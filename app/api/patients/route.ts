import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getEffectiveWorkspace } from '@/lib/get-workspace-id';
import { canAccess, canWrite } from '@/lib/permissions';
import { PatientOrigin, Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (!canAccess((session.user as any).role, 'patients')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const workspace = await getEffectiveWorkspace();

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim();
    const origin = searchParams.get('origin') as PatientOrigin | null;
    const city = searchParams.get('city')?.trim();
    const state = searchParams.get('state')?.trim();
    const hasEmail = searchParams.get('hasEmail');
    const hasBirthday = searchParams.get('hasBirthday');
    const createdFrom = searchParams.get('createdFrom');
    const createdTo = searchParams.get('createdTo');

    const where: Prisma.PatientWhereInput = { workspaceId: workspace.id };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { cpf: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (origin && Object.values(PatientOrigin).includes(origin)) {
      where.origin = origin;
    }

    if (city) {
      where.city = { contains: city, mode: 'insensitive' };
    }

    if (state) {
      where.state = { equals: state.toUpperCase(), mode: 'insensitive' };
    }

    if (hasEmail === 'true') {
      where.email = { not: null };
    } else if (hasEmail === 'false') {
      where.email = null;
    }

    if (hasBirthday === 'true') {
      where.birthday = { not: null };
    } else if (hasBirthday === 'false') {
      where.birthday = null;
    }

    if (createdFrom || createdTo) {
      where.createdAt = {
        ...(createdFrom ? { gte: new Date(createdFrom) } : {}),
        ...(createdTo ? { lte: new Date(createdTo) } : {}),
      };
    }

    const patients = await prisma.patient.findMany({
      where,
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

    if (!canWrite((session.user as any).role, 'patients')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const workspace = await getEffectiveWorkspace();

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
    }

    const body = await req.json();
    const { name, email, phone, birthday, origin, notes, address, city, state, zipCode, cpf } = body;

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
        address: address || null,
        city: city || null,
        state: state || null,
        zipCode: zipCode || null,
        cpf: cpf || null,
        notes: notes || null,
      },
    });

    return NextResponse.json(patient, { status: 201 });
  } catch (error) {
    console.error('Create patient error:', error);
    return NextResponse.json({ error: 'Erro ao criar paciente' }, { status: 500 });
  }
}
