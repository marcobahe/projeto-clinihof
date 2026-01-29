import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verificando custos do workspace john@doe.com...\n');

  // Find john's user and workspace
  const johnUser = await prisma.user.findUnique({
    where: { email: 'john@doe.com' },
  });

  if (!johnUser) {
    console.error('❌ User john@doe.com not found!');
    return;
  }

  const workspace = await prisma.workspace.findFirst({
    where: { ownerId: johnUser.id },
  });

  if (!workspace) {
    console.error('❌ Workspace for john@doe.com not found!');
    return;
  }

  console.log(`✅ Workspace: ${workspace.name}\n`);

  // Get all costs by category
  const fixedCosts = await prisma.cost.findMany({
    where: {
      workspaceId: workspace.id,
      costType: 'FIXED',
      isActive: true,
    },
    orderBy: { fixedValue: 'desc' },
  });

  const taxCosts = await prisma.cost.findMany({
    where: {
      workspaceId: workspace.id,
      category: 'TAX',
      isActive: true,
    },
    orderBy: { percentage: 'desc' },
  });

  const commissionCosts = await prisma.cost.findMany({
    where: {
      workspaceId: workspace.id,
      category: 'COMMISSION',
      isActive: true,
    },
    orderBy: { percentage: 'desc' },
  });

  // Display Fixed Costs
  console.log('💰 CUSTOS FIXOS MENSAIS:');
  console.log('='.repeat(60));
  let totalFixed = 0;
  fixedCosts.forEach((cost) => {
    const value = cost.fixedValue || 0;
    totalFixed += value;
    console.log(`📌 ${cost.description.padEnd(30)} R$ ${value.toFixed(2).padStart(10)}`);
  });
  console.log('-'.repeat(60));
  console.log(`   TOTAL CUSTOS FIXOS:              R$ ${totalFixed.toFixed(2).padStart(10)}`);
  console.log('\n');

  // Display Tax Costs
  console.log('📋 IMPOSTOS E TAXAS (% sobre vendas):');
  console.log('='.repeat(60));
  let totalTaxPercent = 0;
  taxCosts.forEach((cost) => {
    const percent = cost.percentage || 0;
    totalTaxPercent += percent;
    console.log(`📌 ${cost.description.padEnd(30)} ${percent.toFixed(2).padStart(7)}%`);
  });
  console.log('-'.repeat(60));
  console.log(`   CARGA TRIBUTÁRIA TOTAL:          ${totalTaxPercent.toFixed(2).padStart(7)}%`);
  console.log('\n');

  // Display Commission Costs
  console.log('🤝 COMISSÕES (% sobre vendas):');
  console.log('='.repeat(60));
  let totalCommissionPercent = 0;
  commissionCosts.forEach((cost) => {
    const percent = cost.percentage || 0;
    totalCommissionPercent += percent;
    console.log(`📌 ${cost.description.padEnd(30)} ${percent.toFixed(2).padStart(7)}%`);
  });
  console.log('-'.repeat(60));
  console.log(`   TOTAL COMISSÕES:                 ${totalCommissionPercent.toFixed(2).padStart(7)}%`);
  console.log('\n');

  // Summary
  console.log('📊 RESUMO GERAL:');
  console.log('='.repeat(60));
  console.log(`   Total de Custos Fixos:    ${fixedCosts.length}`);
  console.log(`   Total de Impostos:        ${taxCosts.length}`);
  console.log(`   Total de Comissões:       ${commissionCosts.length}`);
  console.log(`   `);
  console.log(`   Custos Fixos Mensais:     R$ ${totalFixed.toFixed(2)}`);
  console.log(`   Carga Tributária:         ${totalTaxPercent.toFixed(2)}%`);
  console.log(`   Comissões Totais:         ${totalCommissionPercent.toFixed(2)}%`);
  console.log('='.repeat(60));
  console.log('\n✅ Verificação concluída!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
