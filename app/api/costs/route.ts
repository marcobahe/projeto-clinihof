import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/costs - List all costs for workspace
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

    const costs = await prisma.cost.findMany({
      where: { 
        workspaceId: workspace.id,
        isActive: true 
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(costs);
  } catch (error) {
    console.error('Error fetching costs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch costs' },
      { status: 500 }
    );
  }
}

// POST /api/costs - Create a new cost
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
    const { 
      description, 
      costType, 
      category, 
      customCategory, 
      fixedValue, 
      percentage, 
      isRecurring, 
      paymentDate, 
      cardOperator, 
      receivingDays,
      recurrenceFrequency,
      nextRecurrenceDate,
      recurrenceType,
      totalInstallments
    } = body;

    // Validações
    if (!description || !costType) {
      return NextResponse.json(
        { error: 'Descrição e tipo de custo são obrigatórios' },
        { status: 400 }
      );
    }

    if (category === 'CUSTOM' && !customCategory) {
      return NextResponse.json(
        { error: 'Nome da categoria customizada é obrigatório' },
        { status: 400 }
      );
    }

    if (costType === 'FIXED' && (!fixedValue || fixedValue <= 0)) {
      return NextResponse.json(
        { error: 'Valor fixo deve ser maior que zero' },
        { status: 400 }
      );
    }

    if (costType === 'PERCENTAGE' && (!percentage || percentage <= 0 || percentage > 100)) {
      return NextResponse.json(
        { error: 'Percentual deve estar entre 0 e 100' },
        { status: 400 }
      );
    }

    // Validação específica para taxas de cartão
    if (category === 'CARD') {
      if (!cardOperator) {
        return NextResponse.json(
          { error: 'Operadora do cartão é obrigatória para taxas de cartão' },
          { status: 400 }
        );
      }
      if (!receivingDays || receivingDays <= 0) {
        return NextResponse.json(
          { error: 'Prazo de recebimento deve ser maior que zero' },
          { status: 400 }
        );
      }
    }

    // Validação para custos parcelados
    if (isRecurring && recurrenceType === 'INSTALLMENTS') {
      if (!totalInstallments || totalInstallments < 2) {
        return NextResponse.json(
          { error: 'Número de parcelas deve ser no mínimo 2 para custos parcelados' },
          { status: 400 }
        );
      }
      if (!nextRecurrenceDate) {
        return NextResponse.json(
          { error: 'Data da primeira parcela é obrigatória para custos parcelados' },
          { status: 400 }
        );
      }
    }

    // Criar custo e parcelas em uma transação
    const result = await prisma.$transaction(async (tx) => {
      // Criar o custo
      const cost = await tx.cost.create({
        data: {
          workspaceId: workspace.id,
          description,
          costType,
          category: category || 'OPERATIONAL',
          customCategory: category === 'CUSTOM' ? customCategory : null,
          fixedValue: costType === 'FIXED' ? fixedValue : null,
          percentage: costType === 'PERCENTAGE' ? percentage : null,
          isRecurring: isRecurring !== undefined ? isRecurring : true,
          paymentDate: paymentDate ? new Date(paymentDate) : null,
          cardOperator: category === 'CARD' ? cardOperator : null,
          receivingDays: category === 'CARD' ? receivingDays : null,
          recurrenceFrequency: isRecurring && recurrenceFrequency ? recurrenceFrequency : null,
          nextRecurrenceDate: isRecurring && nextRecurrenceDate ? new Date(nextRecurrenceDate) : null,
          recurrenceType: isRecurring && recurrenceType ? recurrenceType : 'INDEFINITE',
          totalInstallments: isRecurring && recurrenceType === 'INSTALLMENTS' ? totalInstallments : null,
          currentInstallment: isRecurring && recurrenceType === 'INSTALLMENTS' ? 0 : null,
        },
      });

      // Se for parcelado, criar todas as parcelas
      if (isRecurring && recurrenceType === 'INSTALLMENTS' && totalInstallments && nextRecurrenceDate) {
        const installments = [];
        const amountPerInstallment = fixedValue / totalInstallments;
        const firstDueDate = new Date(nextRecurrenceDate);
        
        // Calcular o intervalo em meses baseado na frequência
        let monthsInterval = 1;
        if (recurrenceFrequency === 'QUARTERLY') {
          monthsInterval = 3;
        } else if (recurrenceFrequency === 'YEARLY') {
          monthsInterval = 12;
        }

        for (let i = 1; i <= totalInstallments; i++) {
          const dueDate = new Date(firstDueDate);
          dueDate.setMonth(dueDate.getMonth() + (i - 1) * monthsInterval);
          
          installments.push({
            costId: cost.id,
            installmentNumber: i,
            amount: amountPerInstallment,
            dueDate: dueDate,
            status: 'PENDING' as const,
          });
        }

        // Criar todas as parcelas
        await tx.costInstallment.createMany({
          data: installments,
        });
      }

      return cost;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating cost:', error);
    return NextResponse.json(
      { error: 'Failed to create cost' },
      { status: 500 }
    );
  }
}