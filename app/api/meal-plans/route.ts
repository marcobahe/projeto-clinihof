import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getUserWorkspace } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

// GET /api/meal-plans
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const workspace = await getUserWorkspace((session.user as any).id);
    if (!workspace) return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get('patientId');

    const plans = await prisma.mealPlan.findMany({
      where: { workspaceId: workspace.id, ...(patientId && { patientId }) },
      include: {
        patient: { select: { id: true, name: true } },
        collaborator: { select: { id: true, name: true } },
        quote: { select: { id: true, title: true, finalAmount: true } },
        days: { include: { meals: true }, orderBy: { dayNumber: 'asc' } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(plans);
  } catch (error) {
    console.error('Error fetching meal plans:', error);
    return NextResponse.json({ error: 'Erro ao buscar planos alimentares' }, { status: 500 });
  }
}

// POST /api/meal-plans
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const workspace = await getUserWorkspace((session.user as any).id);
    if (!workspace) return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });

    const body = await req.json();
    const { patientId, collaboratorId, title, objective, restrictions, observations, startDate, endDate, quoteId, days } = body;

    if (!patientId || !title) {
      return NextResponse.json({ error: 'Paciente e título são obrigatórios' }, { status: 400 });
    }

    const plan = await prisma.mealPlan.create({
      data: {
        workspaceId: workspace.id,
        patientId,
        collaboratorId: collaboratorId || null,
        title,
        objective: objective || null,
        restrictions: restrictions || null,
        observations: observations || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        quoteId: quoteId || null,
        days: days?.length > 0 ? {
          create: days.map((day: any) => ({
            dayNumber: day.dayNumber,
            dayLabel: day.dayLabel || null,
            notes: day.notes || null,
            meals: day.meals?.length > 0 ? {
              create: day.meals.map((meal: any) => ({
                mealType: meal.mealType,
                time: meal.time || null,
                description: meal.description,
                calories: meal.calories || null,
                protein: meal.protein || null,
                carbs: meal.carbs || null,
                fat: meal.fat || null,
                notes: meal.notes || null
              }))
            } : undefined
          }))
        } : undefined
      },
      include: {
        patient: true,
        collaborator: true,
        days: { include: { meals: true } }
      }
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    console.error('Error creating meal plan:', error);
    return NextResponse.json({ error: 'Erro ao criar plano alimentar' }, { status: 500 });
  }
}
