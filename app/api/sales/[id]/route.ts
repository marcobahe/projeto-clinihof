import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/sales/[id] - Get sale details with sessions
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

    const sale = await prisma.sale.findFirst({
      where: {
        id: params.id,
        workspaceId: workspace.id,
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        items: {
          include: {
            procedure: true,
          },
        },
        sessions: {
          include: {
            procedure: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
          orderBy: [
            { status: 'asc' }, // COMPLETED comes before PENDING alphabetically reversed
            { completedDate: 'desc' },
            { createdAt: 'asc' },
          ],
        },
        _count: {
          select: {
            sessions: true,
          },
        },
      },
    });

    if (!sale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    // Calculate completed sessions count
    const completedSessions = sale.sessions.filter(s => s.status === 'COMPLETED').length;

    return NextResponse.json({
      ...sale,
      completedSessions,
    });
  } catch (error) {
    console.error('Error fetching sale:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sale' },
      { status: 500 }
    );
  }
}

// DELETE /api/sales/[id] - Delete a sale
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

    // First check if sale exists and belongs to workspace
    const existingSale = await prisma.sale.findFirst({
      where: {
        id: params.id,
        workspaceId: workspace.id,
      },
    });

    if (!existingSale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    // Delete related sessions first
    await prisma.procedureSession.deleteMany({
      where: { saleId: params.id },
    });

    // Delete sale items
    await prisma.saleItem.deleteMany({
      where: { saleId: params.id },
    });

    // Delete sale
    await prisma.sale.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting sale:', error);
    return NextResponse.json(
      { error: 'Failed to delete sale' },
      { status: 500 }
    );
  }
}
