import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getUserWorkspace } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

/**
 * GET /api/costs/variable
 * Returns only variable costs that incur on sales (taxes, card fees, commissions)
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    console.log('🔐 [Variable Costs API] Session:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      hasEmail: !!session?.user?.email,
      userId: (session?.user as any)?.id,
      email: session?.user?.email
    });
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    if (!userId) {
      console.error('❌ [Variable Costs API] User ID not found in session');
      return NextResponse.json({ error: 'ID do usuário não encontrado na sessão' }, { status: 400 });
    }

    const workspace = await getUserWorkspace(userId);
    console.log('🏢 [Variable Costs API] Workspace:', {
      found: !!workspace,
      workspaceId: workspace?.id,
      ownerId: workspace?.ownerId
    });
    
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
    }

    // Fetch only variable costs that incur on sales
    const variableCosts = await prisma.cost.findMany({
      where: {
        workspaceId: workspace.id,
        isActive: true,
        costType: 'PERCENTAGE', // Only percentage-based costs
        category: {
          in: ['TAX', 'COMMISSION', 'CARD']
        },
        // Only costs with percentage value
        percentage: {
          not: null,
          gt: 0
        }
      },
      orderBy: [
        { category: 'asc' },
        { description: 'asc' }
      ]
    });
    
    console.log('💰 [Variable Costs API] Costs found:', {
      count: variableCosts.length,
      workspaceId: workspace.id,
      costs: variableCosts.map(c => ({
        description: c.description,
        category: c.category,
        percentage: c.percentage
      }))
    });

    // Group by category for easier processing
    const grouped = {
      taxes: variableCosts.filter(c => c.category === 'TAX'),
      commissions: variableCosts.filter(c => c.category === 'COMMISSION'),
      cardFees: variableCosts.filter(c => c.category === 'CARD')
    };

    // Calculate total percentage (all variable costs)
    const totalPercentage = variableCosts.reduce((sum, cost) => {
      return sum + (cost.percentage || 0);
    }, 0);

    // Calculate tax burden (only TAX category)
    const taxBurden = grouped.taxes.reduce((sum, cost) => {
      return sum + (cost.percentage || 0);
    }, 0);

    return NextResponse.json({
      costs: variableCosts,
      grouped,
      totalPercentage,
      taxBurden, // Only taxes
      summary: {
        taxesCount: grouped.taxes.length,
        commissionsCount: grouped.commissions.length,
        cardFeesCount: grouped.cardFees.length,
        totalCount: variableCosts.length
      }
    });
  } catch (error) {
    console.error('Error fetching variable costs:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar custos variáveis' },
      { status: 500 }
    );
  }
}
