import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getUserWorkspace } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

/**
 * GET /api/costs/card-fees
 * Returns all card fee rules for the workspace
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    if (!userId) {
      return NextResponse.json({ error: 'ID do usuário não encontrado' }, { status: 400 });
    }

    const workspace = await getUserWorkspace(userId);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
    }

    // Get all card fee rules for the workspace
    const cardFeeRules = await prisma.cardFeeRule.findMany({
      where: {
        workspaceId: workspace.id,
        isActive: true
      },
      orderBy: [
        { cardOperator: 'asc' },
        { installmentCount: 'asc' }
      ]
    });

    // Get all card costs for reference
    const cardCosts = await prisma.cost.findMany({
      where: {
        workspaceId: workspace.id,
        category: 'CARD',
        isActive: true
      },
      select: {
        id: true,
        description: true,
        cardOperator: true,
        receivingDays: true
      }
    });

    return NextResponse.json({
      rules: cardFeeRules,
      cardCosts
    });
  } catch (error) {
    console.error('Error fetching card fee rules:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar regras de taxas' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/costs/card-fees
 * Create card fee rules for multiple installments
 * Body: { cardOperator, cardType, receivingDays, installments: [{ count, feePercentage }] }
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    if (!userId) {
      return NextResponse.json({ error: 'ID do usuário não encontrado' }, { status: 400 });
    }

    const workspace = await getUserWorkspace(userId);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
    }

    const body = await req.json();
    const { cardOperator, cardType, receivingDays, installments } = body;

    // Validation
    if (!cardOperator || !cardType || receivingDays === undefined || !installments || !Array.isArray(installments) || installments.length === 0) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: cardOperator, cardType, receivingDays, installments (array)' },
        { status: 400 }
      );
    }

    if (receivingDays < 0) {
      return NextResponse.json(
        { error: 'Prazo de recebimento não pode ser negativo' },
        { status: 400 }
      );
    }

    // Validate installments array
    for (const inst of installments) {
      if (!inst.count || inst.count < 1) {
        return NextResponse.json(
          { error: 'Número de parcelas deve ser maior ou igual a 1' },
          { status: 400 }
        );
      }
      if (inst.feePercentage === undefined || inst.feePercentage < 0) {
        return NextResponse.json(
          { error: 'Taxa percentual não pode ser negativa' },
          { status: 400 }
        );
      }
    }

    // Check for duplicate installment counts in the request
    const installmentCounts = installments.map((i: any) => i.count);
    const uniqueCounts = new Set(installmentCounts);
    if (uniqueCounts.size !== installmentCounts.length) {
      return NextResponse.json(
        { error: 'Não pode haver números de parcelas duplicados' },
        { status: 400 }
      );
    }

    // Check for existing rules with same operator, type, and installment counts
    const existingRules = await prisma.cardFeeRule.findMany({
      where: {
        workspaceId: workspace.id,
        cardOperator,
        cardType,
        isActive: true,
        installmentCount: {
          in: installmentCounts
        }
      }
    });

    if (existingRules.length > 0) {
      const existingCounts = existingRules.map(r => r.installmentCount).join(', ');
      return NextResponse.json(
        { error: `Já existem regras para ${cardOperator} ${cardType === 'DEBIT' ? 'Débito' : 'Crédito'} com as seguintes parcelas: ${existingCounts}x` },
        { status: 409 }
      );
    }

    // Create all rules
    const createdRules = await Promise.all(
      installments.map((inst: any) => 
        prisma.cardFeeRule.create({
          data: {
            workspaceId: workspace.id,
            cardOperator,
            cardType,
            installmentCount: inst.count,
            feePercentage: inst.feePercentage,
            receivingDays
          }
        })
      )
    );

    return NextResponse.json({ 
      message: `${createdRules.length} regras criadas com sucesso`,
      rules: createdRules 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating card fee rules:', error);
    return NextResponse.json(
      { error: 'Erro ao criar regras de taxa' },
      { status: 500 }
    );
  }
}
