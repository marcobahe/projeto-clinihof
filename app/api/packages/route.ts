import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/packages - List all active packages for workspace
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspace = await getUserWorkspace((session.user as any).id);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    const packages = await prisma.package.findMany({
      where: {
        workspaceId: workspace.id,
        isActive: true,
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
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(packages);
  } catch (error) {
    console.error('Error fetching packages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch packages' },
      { status: 500 }
    );
  }
}

// POST /api/packages - Create new package
export async function POST(request: NextRequest) {
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

    // Validações
    if (!name || !finalPrice) {
      return NextResponse.json(
        { error: 'Nome e preço final são obrigatórios' },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'O pacote deve conter pelo menos um procedimento' },
        { status: 400 }
      );
    }

    // Criar pacote com itens
    const newPackage = await prisma.package.create({
      data: {
        workspaceId: workspace.id,
        name,
        finalPrice,
        discountPercent: discountPercent || 0,
        items: {
          create: items.map((item: any) => ({
            procedureId: item.procedureId,
            quantity: item.quantity || 1,
          })),
        },
      },
      include: {
        items: {
          include: {
            procedure: true,
          },
        },
      },
    });

    return NextResponse.json(newPackage, { status: 201 });
  } catch (error) {
    console.error('Error creating package:', error);
    return NextResponse.json(
      { error: 'Failed to create package' },
      { status: 500 }
    );
  }
}