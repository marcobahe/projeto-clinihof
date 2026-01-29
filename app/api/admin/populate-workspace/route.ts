import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

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

    console.log(`🚀 Populating workspace: ${workspace.name} (${workspace.id})`);

    // ========== ADICIONAR CUSTOS FIXOS ADICIONAIS ==========
    const additionalFixedCosts = [
      { description: 'Contador / Contabilidade', fixedValue: 650.0 },
      { description: 'Marketing e Publicidade', fixedValue: 1200.0 },
      { description: 'Material de Escritório', fixedValue: 220.0 },
      { description: 'Uniformes e EPIs', fixedValue: 340.0 },
      { description: 'Condomínio', fixedValue: 850.0 },
      { description: 'Licenças e Alvarás', fixedValue: 280.0 },
      { description: 'Seguro da Clínica', fixedValue: 380.0 },
      { description: 'Manutenção Equipamentos', fixedValue: 520.0 },
    ];

    let fixedCostsCreated = 0;
    for (const cost of additionalFixedCosts) {
      // Verificar se já existe
      const existing = await prisma.cost.findFirst({
        where: {
          workspaceId: workspace.id,
          description: cost.description,
        },
      });

      if (!existing) {
        await prisma.cost.create({
          data: {
            workspaceId: workspace.id,
            description: cost.description,
            costType: 'FIXED',
            category: 'OPERATIONAL',
            fixedValue: cost.fixedValue,
            percentage: null,
            paymentDate: null,
            isRecurring: true,
          },
        });
        fixedCostsCreated++;
      }
    }

    // ========== ADICIONAR IMPOSTOS ADICIONAIS ==========
    const additionalTaxes = [
      { description: 'Simples Nacional', percentage: 6.0 },
      { description: 'PIS', percentage: 0.65 },
      { description: 'COFINS', percentage: 3.0 },
      { description: 'IRPJ', percentage: 2.5 },
      { description: 'CSLL', percentage: 1.08 },
    ];

    let taxesCreated = 0;
    for (const tax of additionalTaxes) {
      // Verificar se já existe
      const existing = await prisma.cost.findFirst({
        where: {
          workspaceId: workspace.id,
          description: tax.description,
        },
      });

      if (!existing) {
        await prisma.cost.create({
          data: {
            workspaceId: workspace.id,
            description: tax.description,
            costType: 'PERCENTAGE',
            category: 'TAX',
            fixedValue: null,
            percentage: tax.percentage,
            paymentDate: null,
            isRecurring: true,
          },
        });
        taxesCreated++;
      }
    }

    // ========== ADICIONAR COMISSÕES ==========
    const commissions = [
      { description: 'Comissão Equipe Vendas', percentage: 5.0 },
      { description: 'Comissão Profissionais', percentage: 8.0 },
      { description: 'Comissão Recepção', percentage: 2.5 },
    ];

    let commissionsCreated = 0;
    for (const commission of commissions) {
      // Verificar se já existe
      const existing = await prisma.cost.findFirst({
        where: {
          workspaceId: workspace.id,
          description: commission.description,
        },
      });

      if (!existing) {
        await prisma.cost.create({
          data: {
            workspaceId: workspace.id,
            description: commission.description,
            costType: 'PERCENTAGE',
            category: 'COMMISSION',
            fixedValue: null,
            percentage: commission.percentage,
            paymentDate: null,
            isRecurring: true,
          },
        });
        commissionsCreated++;
      }
    }

    // ========== VERIFICAR TOTAIS ==========
    const allCosts = await prisma.cost.findMany({
      where: { workspaceId: workspace.id },
    });

    const byCategory = allCosts.reduce((acc: Record<string, number>, cost: any) => {
      if (!acc[cost.category]) acc[cost.category] = 0;
      acc[cost.category]++;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      message: 'Workspace populated successfully!',
      created: {
        fixedCosts: fixedCostsCreated,
        taxes: taxesCreated,
        commissions: commissionsCreated,
      },
      totals: {
        all: allCosts.length,
        byCategory,
      },
    });
  } catch (error) {
    console.error('Error populating workspace:', error);
    return NextResponse.json(
      { error: 'Failed to populate workspace', details: String(error) },
      { status: 500 }
    );
  }
}
