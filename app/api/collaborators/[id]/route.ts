import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getUserWorkspace } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

// GET - Get collaborator by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const workspace = await getUserWorkspace((session.user as any).id);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
    }

    const { id } = await params;
    const collaborator = await prisma.collaborator.findFirst({
      where: {
        id,
        workspaceId: workspace.id,
      },
    });

    if (!collaborator) {
      return NextResponse.json({ error: 'Colaborador não encontrado' }, { status: 404 });
    }

    // Calculate hourlyCost
    const collaboratorWithCost = {
      ...collaborator,
      hourlyCost: (collaborator.baseSalary + collaborator.charges) / collaborator.monthlyHours
    };

    return NextResponse.json(collaboratorWithCost);
  } catch (error) {
    console.error('Error fetching collaborator:', error);
    return NextResponse.json({ error: 'Erro ao buscar colaborador' }, { status: 500 });
  }
}

// PATCH - Update collaborator
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const workspace = await getUserWorkspace((session.user as any).id);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
    }

    const { id } = await params;
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
      isActive,
    } = body;

    // Check if collaborator exists and belongs to workspace
    const existing = await prisma.collaborator.findFirst({
      where: {
        id,
        workspaceId: workspace.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Colaborador não encontrado' }, { status: 404 });
    }

    const collaborator = await prisma.collaborator.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(cpf !== undefined && { cpf: cpf || null }),
        ...(rg !== undefined && { rg: rg || null }),
        ...(birthDate !== undefined && { birthDate: birthDate ? new Date(birthDate) : null }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(email !== undefined && { email: email || null }),
        ...(address !== undefined && { address: address || null }),
        ...(city !== undefined && { city: city || null }),
        ...(state !== undefined && { state: state || null }),
        ...(zipCode !== undefined && { zipCode: zipCode || null }),
        ...(role !== undefined && { role }),
        ...(admissionDate !== undefined && { admissionDate: admissionDate ? new Date(admissionDate) : null }),
        ...(baseSalary !== undefined && { baseSalary: parseFloat(baseSalary) || 0 }),
        ...(commissionType !== undefined && { commissionType }),
        ...(commissionValue !== undefined && { commissionValue: parseFloat(commissionValue) || 0 }),
        ...(charges !== undefined && { charges: parseFloat(charges) || 0 }),
        ...(monthlyHours !== undefined && { monthlyHours: parseInt(monthlyHours) || 160 }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    // Calculate hourlyCost
    const collaboratorWithCost = {
      ...collaborator,
      hourlyCost: (collaborator.baseSalary + collaborator.charges) / collaborator.monthlyHours
    };

    return NextResponse.json(collaboratorWithCost);
  } catch (error) {
    console.error('Error updating collaborator:', error);
    return NextResponse.json({ error: 'Erro ao atualizar colaborador' }, { status: 500 });
  }
}

// DELETE - Delete collaborator
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const workspace = await getUserWorkspace((session.user as any).id);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
    }

    const { id } = await params;
    
    // Check if collaborator exists and belongs to workspace
    const existing = await prisma.collaborator.findFirst({
      where: {
        id,
        workspaceId: workspace.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Colaborador não encontrado' }, { status: 404 });
    }

    await prisma.collaborator.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting collaborator:', error);
    return NextResponse.json({ error: 'Erro ao excluir colaborador' }, { status: 500 });
  }
}
