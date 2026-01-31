import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getUserWorkspace } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

// GET /api/patients/stats/origin - Get patient origin statistics
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const workspace = await getUserWorkspace((session.user as any).id);

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
    }

    // Get patient counts by origin
    const originStats = await prisma.patient.groupBy({
      by: ['origin'],
      where: { workspaceId: workspace.id },
      _count: { id: true },
    });

    // Transform data for the chart
    const originLabels: Record<string, string> = {
      INSTAGRAM: 'Instagram',
      INDICACAO: 'Indicação',
      GOOGLE: 'Google',
      WHATSAPP: 'WhatsApp',
      FACEBOOK: 'Facebook',
      SITE: 'Site',
      OUTROS: 'Outros',
    };

    const stats = originStats.map((item) => ({
      origin: item.origin || 'NAO_INFORMADO',
      label: item.origin ? originLabels[item.origin] : 'Não Informado',
      count: item._count.id,
    }));

    // Also count patients without origin
    const withoutOrigin = await prisma.patient.count({
      where: {
        workspaceId: workspace.id,
        origin: null,
      },
    });

    // Add "Não Informado" if there are patients without origin
    if (withoutOrigin > 0) {
      const existingNoInfo = stats.find((s) => s.origin === 'NAO_INFORMADO');
      if (!existingNoInfo) {
        stats.push({
          origin: 'NAO_INFORMADO',
          label: 'Não Informado',
          count: withoutOrigin,
        });
      }
    }

    // Get total patients
    const totalPatients = await prisma.patient.count({
      where: { workspaceId: workspace.id },
    });

    return NextResponse.json({
      stats,
      total: totalPatients,
    });
  } catch (error) {
    console.error('Get patient origin stats error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar estatísticas de origem' },
      { status: 500 }
    );
  }
}
