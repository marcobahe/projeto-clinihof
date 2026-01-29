import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getUserWorkspace } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

// GET - List all collaborators
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const workspace = await getUserWorkspace((session.user as any).id);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    const collaborators = await prisma.collaborator.findMany({
      where: {
        workspaceId: workspace.id,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { role: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Calculate hourlyCost for each collaborator
    const collaboratorsWithCost = collaborators.map(collab => ({
      ...collab,
      hourlyCost: (collab.baseSalary + collab.charges) / collab.monthlyHours
    }));

    return NextResponse.json(collaboratorsWithCost);
  } catch (error) {
    console.error('Error fetching collaborators:', error);
    return NextResponse.json({ error: 'Erro ao buscar colaboradores' }, { status: 500 });
  }
}

// POST - Create new collaborator
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const workspace = await getUserWorkspace((session.user as any).id);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      cpf,
      rg,
      birthDate,
      phone,
      email,
      address,
      city,
      state,
      zipCode,
      role,
      admissionDate,
      baseSalary,
      commissionType,
      commissionValue,
      charges,
      monthlyHours,
    } = body;

    if (!name || !role) {
      return NextResponse.json(
        { error: 'Nome e função são obrigatórios' },
        { status: 400 }
      );
    }

    const collaborator = await prisma.collaborator.create({
      data: {
        workspaceId: workspace.id,
        name,
        cpf: cpf || null,
        rg: rg || null,
        birthDate: birthDate ? new Date(birthDate) : null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        city: city || null,
        state: state || null,
        zipCode: zipCode || null,
        role,
        admissionDate: admissionDate ? new Date(admissionDate) : null,
        baseSalary: parseFloat(baseSalary) || 0,
        commissionType: commissionType || 'PERCENTAGE',
        commissionValue: parseFloat(commissionValue) || 0,
        charges: parseFloat(charges) || 0,
        monthlyHours: parseInt(monthlyHours) || 160,
      },
    });

    // Calculate hourlyCost
    const collaboratorWithCost = {
      ...collaborator,
      hourlyCost: (collaborator.baseSalary + collaborator.charges) / collaborator.monthlyHours
    };

    return NextResponse.json(collaboratorWithCost, { status: 201 });
  } catch (error) {
    console.error('Error creating collaborator:', error);
    return NextResponse.json({ error: 'Erro ao criar colaborador' }, { status: 500 });
  }
}
