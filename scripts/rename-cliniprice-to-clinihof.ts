import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const prisma = new PrismaClient();

async function renameClinicPriceToCliniHOF() {
  try {
    console.log('🔍 Procurando workspaces com nome "CliniPrice"...');

    // Buscar todos os workspaces que contém "CliniPrice" no nome
    const workspaces = await prisma.workspace.findMany({
      where: {
        OR: [
          { name: { contains: 'CliniPrice', mode: 'insensitive' } },
          { name: { contains: 'cliniprice', mode: 'insensitive' } },
          { name: { contains: 'CLINIPRICE', mode: 'insensitive' } },
        ],
      },
      include: {
        owner: {
          select: {
            email: true,
            fullName: true,
          },
        },
      },
    });

    console.log(`\n📊 Encontrados ${workspaces.length} workspaces com "CliniPrice" no nome:\n`);

    if (workspaces.length === 0) {
      console.log('✅ Nenhum workspace encontrado com "CliniPrice" no nome.');
      return;
    }

    // Mostrar os workspaces encontrados
    workspaces.forEach((ws, index) => {
      console.log(`${index + 1}. Workspace ID: ${ws.id}`);
      console.log(`   Nome atual: "${ws.name}"`);
      console.log(`   Proprietário: ${ws.owner.fullName} (${ws.owner.email})`);
      console.log('');
    });

    // Atualizar cada workspace
    console.log('🔄 Iniciando atualização...\n');

    for (const workspace of workspaces) {
      const newName = workspace.name.replace(/CliniPrice/gi, 'CliniHOF');

      await prisma.workspace.update({
        where: { id: workspace.id },
        data: { name: newName },
      });

      console.log(`✅ Workspace "${workspace.id}" atualizado:`);
      console.log(`   De: "${workspace.name}"`);
      console.log(`   Para: "${newName}"\n`);
    }

    console.log('\n🎉 Todos os workspaces foram atualizados com sucesso!');
    console.log(`\n📊 Resumo: ${workspaces.length} workspace(s) atualizado(s).`);
  } catch (error) {
    console.error('❌ Erro ao renomear workspaces:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

renameClinicPriceToCliniHOF()
  .catch((error) => {
    console.error('Erro fatal:', error);
    process.exit(1);
  });
