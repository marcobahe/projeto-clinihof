import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getUserWorkspace } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/costs/card-fees/group?operator=X&type=Y
 * Delete all rules for a specific operator + type combination
 */
export async function DELETE(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const cardOperator = searchParams.get('operator');
    const cardType = searchParams.get('type');

    if (!cardOperator || !cardType) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios: operator, type' },
        { status: 400 }
      );
    }

    // Soft delete all rules for this operator + type
    await prisma.cardFeeRule.updateMany({
      where: {
        workspaceId: workspace.id,
        cardOperator,
        cardType,
        isActive: true
      },
      data: {
        isActive: false
      }
    });

    return NextResponse.json({ message: 'Cartão excluído com sucesso' });
  } catch (error) {
    console.error('Error deleting card fee group:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir cartão' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/costs/card-fees/group
 * Update all rules for a specific operator + type combination
 * Body: { cardOperator, cardType, receivingDays, installments: [{ count, feePercentage }] }
 */
export async function PATCH(req: Request) {
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

    // Validate installments
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

    // Delete existing rules for this operator + type
    await prisma.cardFeeRule.updateMany({
      where: {
        workspaceId: workspace.id,
        cardOperator,
        cardType,
        isActive: true
      },
      data: {
        isActive: false
      }
    });

    // Create new rules
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
      message: 'Cartão atualizado com sucesso',
      rules: createdRules 
    });
  } catch (error) {
    console.error('Error updating card fee group:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar cartão' },
      { status: 500 }
    );
  }
}
