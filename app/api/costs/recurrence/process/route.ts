import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getUserWorkspace } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

/**
 * POST /api/costs/recurrence/process
 * Processa custos recorrentes que atingiram a data de replicação
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const workspace = await getUserWorkspace((session.user as any).id);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Busca custos recorrentes que precisam ser replicados
    const costsToReplicate = await prisma.cost.findMany({
      where: {
        workspaceId: workspace.id,
        isActive: true,
        costType: 'FIXED',
        recurrenceFrequency: {
          not: null,
        },
        nextRecurrenceDate: {
          lte: today,
        },
      },
    });

    if (costsToReplicate.length === 0) {
      return NextResponse.json({
        message: 'Nenhum custo recorrente para processar',
        processedCount: 0,
      });
    }

    const results = [];

    for (const cost of costsToReplicate) {
      try {
        // Calcula a próxima data de recorrência
        const nextDate = calculateNextRecurrenceDate(
          cost.nextRecurrenceDate!,
          cost.recurrenceFrequency as 'MONTHLY' | 'QUARTERLY' | 'YEARLY'
        );

        // Cria o novo custo (replicação)
        const newCost = await prisma.cost.create({
          data: {
            workspaceId: workspace.id,
            description: cost.description,
            category: cost.category,
            costType: cost.costType,
            fixedValue: cost.fixedValue,
            percentage: cost.percentage,
            paymentDate: cost.nextRecurrenceDate!,
            recurrenceFrequency: cost.recurrenceFrequency,
            nextRecurrenceDate: nextDate,
            isRecurring: true,
            isActive: true,
            customCategory: cost.customCategory,
            cardOperator: cost.cardOperator,
            receivingDays: cost.receivingDays,
          },
        });

        // Atualiza o custo original com a nova data de recorrência
        await prisma.cost.update({
          where: { id: cost.id },
          data: {
            nextRecurrenceDate: nextDate,
          },
        });

        results.push({
          originalId: cost.id,
          newId: newCost.id,
          description: cost.description,
          fixedValue: cost.fixedValue,
          nextDate: nextDate,
        });
      } catch (error) {
        console.error(`Erro ao replicar custo ${cost.id}:`, error);
      }
    }

    return NextResponse.json({
      message: `${results.length} custo(s) recorrente(s) replicado(s) com sucesso`,
      processedCount: results.length,
      details: results,
    });
  } catch (error) {
    console.error('Erro ao processar custos recorrentes:', error);
    return NextResponse.json(
      { error: 'Erro ao processar custos recorrentes' },
      { status: 500 }
    );
  }
}

/**
 * Calcula a próxima data de recorrência baseada na frequência
 */
function calculateNextRecurrenceDate(
  currentDate: Date,
  frequency: 'MONTHLY' | 'QUARTERLY' | 'YEARLY'
): Date {
  const nextDate = new Date(currentDate);

  switch (frequency) {
    case 'MONTHLY':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'QUARTERLY':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'YEARLY':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
  }

  return nextDate;
}
