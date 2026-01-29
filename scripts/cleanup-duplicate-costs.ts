import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Removendo custos duplicados do workspace john@doe.com...\n');

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

  // Get all costs
  const allCosts = await prisma.cost.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: 'asc' }, // Keep the oldest one
  });

  console.log(`📊 Total costs found: ${allCosts.length}`);

  // Group by description
  const costsByDescription = new Map<string, typeof allCosts>();
  
  allCosts.forEach((cost) => {
    if (!costsByDescription.has(cost.description)) {
      costsByDescription.set(cost.description, []);
    }
    costsByDescription.get(cost.description)!.push(cost);
  });

  let duplicatesRemoved = 0;

  // Remove duplicates - keep the first (oldest) one
  for (const [description, costs] of costsByDescription.entries()) {
    if (costs.length > 1) {
      console.log(`🔄 Found ${costs.length} duplicates of "${description}"`);
      
      // Keep the first one, delete the rest
      const toDelete = costs.slice(1);
      
      for (const cost of toDelete) {
        await prisma.cost.delete({
          where: { id: cost.id },
        });
        duplicatesRemoved++;
      }
      
      console.log(`   ✅ Kept the oldest one, removed ${toDelete.length} duplicates`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Cleanup completed!`);
  console.log(`🗑️  Total duplicates removed: ${duplicatesRemoved}`);
  console.log(`📊 Unique costs remaining: ${costsByDescription.size}`);
  console.log('='.repeat(60));
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
