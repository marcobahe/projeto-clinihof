import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getUserWorkspace } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

/**
 * GET /api/debug/costs
 * Diagnostic endpoint to check why variable costs are not being returned
 * Version: 1.0.1
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    const diagnostic = {
      timestamp: new Date().toISOString(),
      session: {
        exists: !!session,
        hasUser: !!session?.user,
        email: session?.user?.email || 'N/A',
        userId: (session?.user as any)?.id || 'N/A',
        name: session?.user?.name || 'N/A'
      },
      workspace: null as any,
      costs: {
        all: [] as any[],
        variable: [] as any[],
        percentage: [] as any[]
      }
    };
    
    if (!session?.user?.email) {
      return NextResponse.json({
        error: 'Não autorizado',
        diagnostic
      }, { status: 401 });
    }

    const userId = (session.user as any).id;
    if (!userId) {
      return NextResponse.json({
        error: 'ID do usuário não encontrado na sessão',
        diagnostic
      }, { status: 400 });
    }

    // Get workspace
    const workspace = await getUserWorkspace(userId);
    diagnostic.workspace = {
      exists: !!workspace,
      id: workspace?.id || 'N/A',
      name: workspace?.name || 'N/A',
      ownerId: workspace?.ownerId || 'N/A'
    };
    
    if (!workspace) {
      return NextResponse.json({
        error: 'Workspace não encontrado',
        diagnostic
      }, { status: 404 });
    }

    // Get ALL costs for this workspace
    const allCosts = await prisma.cost.findMany({
      where: {
        workspaceId: workspace.id
      },
      select: {
        id: true,
        description: true,
        category: true,
        costType: true,
        percentage: true,
        fixedValue: true,
        isActive: true
      }
    });
    
    diagnostic.costs.all = allCosts;

    // Get variable costs (PERCENTAGE type)
    const variableCosts = await prisma.cost.findMany({
      where: {
        workspaceId: workspace.id,
        isActive: true,
        costType: 'PERCENTAGE',
        category: {
          in: ['TAX', 'COMMISSION', 'CARD']
        },
        percentage: {
          not: null,
          gt: 0
        }
      }
    });
    
    diagnostic.costs.variable = variableCosts.map(c => ({
      id: c.id,
      description: c.description,
      category: c.category,
      costType: c.costType,
      percentage: c.percentage,
      isActive: c.isActive
    }));

    // Get all PERCENTAGE costs regardless of category
    const percentageCosts = await prisma.cost.findMany({
      where: {
        workspaceId: workspace.id,
        isActive: true,
        costType: 'PERCENTAGE'
      }
    });
    
    diagnostic.costs.percentage = percentageCosts.map(c => ({
      id: c.id,
      description: c.description,
      category: c.category,
      costType: c.costType,
      percentage: c.percentage,
      isActive: c.isActive
    }));

    return NextResponse.json({
      success: true,
      diagnostic,
      summary: {
        totalCosts: allCosts.length,
        variableCosts: variableCosts.length,
        percentageCosts: percentageCosts.length,
        activeCosts: allCosts.filter(c => c.isActive).length,
        taxCosts: allCosts.filter(c => c.category === 'TAX').length,
        cardCosts: allCosts.filter(c => c.category === 'CARD').length,
        commissionCosts: allCosts.filter(c => c.category === 'COMMISSION').length
      }
    });
  } catch (error: any) {
    console.error('Error in debug endpoint:', error);
    return NextResponse.json(
      { 
        error: 'Erro ao buscar dados de diagnóstico',
        message: error.message,
        stack: error.stack
      },
      { status: 500 }
    );
  }
}
