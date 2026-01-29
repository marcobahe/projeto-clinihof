import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/packages/[id] - Get package details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspace = await getUserWorkspace((session.user as any).id);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    const packageData = await prisma.package.findFirst({
      where: {
        id: params.id,
        workspaceId: workspace.id,
      },
      include: {
        items: {
          include: {
            procedure: {
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
            },
          },
        },
      },
    });

    if (!packageData) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    }

    return NextResponse.json(packageData);
  } catch (error) {
    console.error('Error fetching package:', error);
    return NextResponse.json(
      { error: 'Failed to fetch package' },
      { status: 500 }
    );
  }
}

// PATCH /api/packages/[id] - Update package
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspace = await getUserWorkspace((session.user as any).id);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, finalPrice, discountPercent, items } = body;

    // Verificar se o pacote pertence ao workspace
    const existingPackage = await prisma.package.findFirst({
      where: {
        id: params.id,
        workspaceId: workspace.id,
      },
    });

    if (!existingPackage) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    }

    // Se os items foram fornecidos, deletar os antigos e criar novos
    if (items && Array.isArray(items)) {
      await prisma.packageItem.deleteMany({
        where: { packageId: params.id },
      });
    }

    const updatedPackage = await prisma.package.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(finalPrice !== undefined && { finalPrice }),
        ...(discountPercent !== undefined && { discountPercent }),
        ...(items && {
          items: {
            create: items.map((item: any) => ({
              procedureId: item.procedureId,
              quantity: item.quantity || 1,
            })),
          },
        }),
      },
      include: {
        items: {
          include: {
            procedure: true,
          },
        },
      },
    });

    return NextResponse.json(updatedPackage);
  } catch (error) {
    console.error('Error updating package:', error);
    return NextResponse.json(
      { error: 'Failed to update package' },
      { status: 500 }
    );
  }
}

// DELETE /api/packages/[id] - Soft delete package
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspace = await getUserWorkspace((session.user as any).id);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Verificar se o pacote pertence ao workspace
    const existingPackage = await prisma.package.findFirst({
      where: {
        id: params.id,
        workspaceId: workspace.id,
      },
    });

    if (!existingPackage) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    }

    // Soft delete
    await prisma.package.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({ message: 'Package deleted successfully' });
  } catch (error) {
    console.error('Error deleting package:', error);
    return NextResponse.json(
      { error: 'Failed to delete package' },
      { status: 500 }
    );
  }
}