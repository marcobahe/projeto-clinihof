import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getUserWorkspace } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

// GET /api/prescriptions
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const workspace = await getUserWorkspace((session.user as any).id);
    if (!workspace) return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get('patientId');

    const prescriptions = await prisma.prescription.findMany({
      where: { workspaceId: workspace.id, ...(patientId && { patientId }) },
      include: { patient: { select: { id: true, name: true } }, collaborator: { select: { id: true, name: true } }, items: true },
      orderBy: { date: 'desc' }
    });

    return NextResponse.json(prescriptions);
  } catch (error) {
    console.error('Error fetching prescriptions:', error);
    return NextResponse.json({ error: 'Erro ao buscar receitas' }, { status: 500 });
  }
}

// POST /api/prescriptions
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const workspace = await getUserWorkspace((session.user as any).id);
    if (!workspace) return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });

    const body = await req.json();
    const { patientId, collaboratorId, diagnosis, instructions, observations, items } = body;

    if (!patientId || !instructions) {
      return NextResponse.json({ error: 'Paciente e instruções são obrigatórios' }, { status: 400 });
    }

    const prescription = await prisma.prescription.create({
      data: {
        workspaceId: workspace.id,
        patientId,
        collaboratorId: collaboratorId || null,
        diagnosis: diagnosis || null,
        instructions,
        observations: observations || null,
        items: items?.length > 0 ? {
          create: items.map((item: any) => ({
            medication: item.medication,
            dosage: item.dosage,
            frequency: item.frequency,
            duration: item.duration,
            notes: item.notes || null
          }))
        } : undefined
      },
      include: { patient: true, collaborator: true, items: true }
    });

    return NextResponse.json(prescription, { status: 201 });
  } catch (error) {
    console.error('Error creating prescription:', error);
    return NextResponse.json({ error: 'Erro ao criar receita' }, { status: 500 });
  }
}
