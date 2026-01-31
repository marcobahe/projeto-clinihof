import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getEffectiveWorkspace } from '@/lib/get-workspace-id';

export const dynamic = 'force-dynamic';

// Helper function to calculate procedure costs
function calculateProcedureCosts(procedure: any) {
  // Calculate supply costs
  const supplyCost = procedure.supplies?.reduce((sum: number, ps: any) => {
    return sum + (ps.supply?.costPerUnit || 0) * ps.quantity;
  }, 0) || 0;

  // Calculate collaborator costs
  const collaboratorCost = procedure.collaborators?.reduce((sum: number, pc: any) => {
    if (!pc.collaborator) return sum;
    const hourlyCost = (pc.collaborator.baseSalary + pc.collaborator.charges) / pc.collaborator.monthlyHours;
    const timeCost = (pc.timeMinutes / 60) * hourlyCost;
    return sum + timeCost;
  }, 0) || 0;

  // Total cost = fixedCost + supplyCost + collaboratorCost
  const totalCost = (procedure.fixedCost || 0) + supplyCost + collaboratorCost;

  // Profit margin
  const profitMargin = procedure.price > 0 ? ((procedure.price - totalCost) / procedure.price) * 100 : 0;

  return {
    ...procedure,
    supplyCost,
    collaboratorCost,
    totalCost,
    profitMargin,
    collaborators: procedure.collaborators?.map((pc: any) => ({
      ...pc,
      collaborator: pc.collaborator ? {
        ...pc.collaborator,
        hourlyCost: (pc.collaborator.baseSalary + pc.collaborator.charges) / pc.collaborator.monthlyHours
      } : null
    }))
  };
}

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

    const procedures = await prisma.procedure.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: 'desc' },
      include: {
        supplies: {
          include: {
            supply: true,
          },
        },
        collaborators: {
          include: {
            collaborator: true,
          },
        },
      },
    });

    // Calculate costs for each procedure
    const proceduresWithCost = procedures.map(proc => calculateProcedureCosts(proc));

    return NextResponse.json(proceduresWithCost);
  } catch (error) {
    console.error('Get procedures error:', error);
    return NextResponse.json({ error: 'Erro ao buscar procedimentos' }, { status: 500 });
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
    const { name, price, duration, fixedCost, color, supplies, collaborators } = body;

    if (!name || price === undefined) {
      return NextResponse.json(
        { error: 'Nome e preço são obrigatórios' },
        { status: 400 }
      );
    }

    const procedure = await prisma.procedure.create({
      data: {
        workspaceId: workspace.id,
        name,
        price: parseFloat(price),
        duration: parseInt(duration) || 0,
        fixedCost: fixedCost ? parseFloat(fixedCost) : 0,
        color: color || null,
        supplies: supplies?.length > 0 ? {
          create: supplies.map((s: { supplyId: string; quantity: number }) => ({
            supplyId: s.supplyId,
            quantity: s.quantity,
          })),
        } : undefined,
        collaborators: collaborators?.length > 0 ? {
          create: collaborators.map((c: { collaboratorId: string; timeMinutes: number }) => ({
            collaboratorId: c.collaboratorId,
            timeMinutes: c.timeMinutes,
          })),
        } : undefined,
      },
      include: {
        supplies: {
          include: {
            supply: true,
          },
        },
        collaborators: {
          include: {
            collaborator: true,
          },
        },
      },
    });

    // Calculate hourlyCost for each collaborator and total cost
    const procedureWithCost = calculateProcedureCosts(procedure);

    return NextResponse.json(procedureWithCost, { status: 201 });
  } catch (error) {
    console.error('Create procedure error:', error);
    return NextResponse.json({ error: 'Erro ao criar procedimento' }, { status: 500 });
  }
}
