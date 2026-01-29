import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getUserWorkspace } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspace = await getUserWorkspace((session.user as any).id);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Get all collaborators
    const collaborators = await prisma.collaborator.findMany({
      where: { workspaceId: workspace.id },
      select: {
        isActive: true,
        baseSalary: true,
        charges: true,
      },
    });

    // Total collaborators
    const totalCollaborators = collaborators.length;

    // Active collaborators
    const activeCollaborators = collaborators.filter((c) => c.isActive).length;

    // Total monthly cost (baseSalary + charges for active collaborators)
    const totalMonthlyCost = collaborators
      .filter((c) => c.isActive)
      .reduce((sum, c) => sum + c.baseSalary + c.charges, 0);

    return NextResponse.json({
      totalCollaborators,
      activeCollaborators,
      totalMonthlyCost,
    });
  } catch (error) {
    console.error('Failed to fetch collaborator stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collaborator stats' },
      { status: 500 }
    );
  }
}
