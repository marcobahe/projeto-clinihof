import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getUserWorkspace } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

// GET /api/formulas
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const workspace = await getUserWorkspace((session.user as any).id);
    if (!workspace) return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get('patientId');

    const formulas = await prisma.formula.findMany({
      where: { workspaceId: workspace.id, ...(patientId && { patientId }) },
      include: { patient: { select: { id: true, name: true } }, collaborator: { select: { id: true, name: true } } },
      orderBy: { date: 'desc' }
    });

    return NextResponse.json(formulas);
  } catch (error) {
    console.error('Error fetching formulas:', error);
    return NextResponse.json({ error: 'Erro ao buscar fórmulas' }, { status: 500 });
  }
}

// POST /api/formulas
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const workspace = await getUserWorkspace((session.user as any).id);
    if (!workspace) return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });

    const body = await req.json();
    const { patientId, collaboratorId, name, description, ingredients, posology, validity, compoundPharmacy } = body;

    if (!patientId || !name || !ingredients) {
      return NextResponse.json({ error: 'Paciente, nome e ingredientes são obrigatórios' }, { status: 400 });
    }

    const formula = await prisma.formula.create({
      data: {
        workspaceId: workspace.id,
        patientId,
        collaboratorId: collaboratorId || null,
        name,
        description: description || null,
        ingredients,
        posology: posology || null,
        validity: validity || null,
        compoundPharmacy: compoundPharmacy || null
      },
      include: { patient: true, collaborator: true }
    });

    return NextResponse.json(formula, { status: 201 });
  } catch (error) {
    console.error('Error creating formula:', error);
    return NextResponse.json({ error: 'Erro ao criar fórmula' }, { status: 500 });
  }
}
