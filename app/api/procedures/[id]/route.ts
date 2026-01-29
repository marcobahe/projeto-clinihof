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

    const procedure = await prisma.procedure.findFirst({
      where: {
        id,
        workspaceId: workspace.id,
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

    if (!procedure) {
      return NextResponse.json({ error: 'Procedimento não encontrado' }, { status: 404 });
    }

    // Calculate hourlyCost for each collaborator
    const procedureWithCost = {
      ...procedure,
      collaborators: procedure.collaborators.map(pc => ({
        ...pc,
        collaborator: pc.collaborator ? {
          ...pc.collaborator,
          hourlyCost: (pc.collaborator.baseSalary + pc.collaborator.charges) / pc.collaborator.monthlyHours
        } : null
      }))
    };

    return NextResponse.json(procedureWithCost);
  } catch (error) {
    console.error('Get procedure error:', error);
    return NextResponse.json({ error: 'Erro ao buscar procedimento' }, { status: 500 });
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
    const { name, price, duration, supplies, collaborators } = body;

    if (!name || price === undefined) {
      return NextResponse.json(
        { error: 'Nome e preço são obrigatórios' },
        { status: 400 }
      );
    }

    // Update procedure and manage relations in a transaction
    const procedure = await prisma.$transaction(async (tx) => {
      // Delete existing supplies and collaborators
      await tx.procedureSupply.deleteMany({
        where: { procedureId: id },
      });
      await tx.procedureCollaborator.deleteMany({
        where: { procedureId: id },
      });

      // Update procedure with new relations
      return tx.procedure.update({
        where: { id },
        data: {
          name,
          price: parseFloat(price),
          duration: parseInt(duration) || 0,
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
    });

    // Calculate hourlyCost for each collaborator
    const procedureWithCost = {
      ...procedure,
      collaborators: procedure.collaborators.map(pc => ({
        ...pc,
        collaborator: pc.collaborator ? {
          ...pc.collaborator,
          hourlyCost: (pc.collaborator.baseSalary + pc.collaborator.charges) / pc.collaborator.monthlyHours
        } : null
      }))
    };

    return NextResponse.json(procedureWithCost);
  } catch (error) {
    console.error('Update procedure error:', error);
    return NextResponse.json({ error: 'Erro ao atualizar procedimento' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
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
    const { name, price, duration, supplies, collaborators } = body;

    // Update procedure and manage relations in a transaction
    const procedure = await prisma.$transaction(async (tx) => {
      // Delete existing supplies and collaborators
      await tx.procedureSupply.deleteMany({
        where: { procedureId: id },
      });
      await tx.procedureCollaborator.deleteMany({
        where: { procedureId: id },
      });

      // Update procedure with new relations
      return tx.procedure.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(price !== undefined && { price: parseFloat(price) }),
          ...(duration !== undefined && { duration: parseInt(duration) || 0 }),
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
    });

    // Calculate hourlyCost for each collaborator
    const procedureWithCost = {
      ...procedure,
      collaborators: procedure.collaborators.map(pc => ({
        ...pc,
        collaborator: pc.collaborator ? {
          ...pc.collaborator,
          hourlyCost: (pc.collaborator.baseSalary + pc.collaborator.charges) / pc.collaborator.monthlyHours
        } : null
      }))
    };

    return NextResponse.json(procedureWithCost);
  } catch (error) {
    console.error('Update procedure error:', error);
    return NextResponse.json({ error: 'Erro ao atualizar procedimento' }, { status: 500 });
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

    const procedure = await prisma.procedure.deleteMany({
      where: {
        id,
        workspaceId: workspace.id,
      },
    });

    if (procedure.count === 0) {
      return NextResponse.json({ error: 'Procedimento não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Procedimento excluído com sucesso' });
  } catch (error) {
    console.error('Delete procedure error:', error);
    return NextResponse.json({ error: 'Erro ao excluir procedimento' }, { status: 500 });
  }
}