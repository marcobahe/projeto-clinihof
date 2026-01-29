import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createExampleData } from '../lib/seed-data';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const user = await prisma.user.upsert({
    where: { email: 'admin@clinica.com' },
    update: {},
    create: {
      email: 'admin@clinica.com',
      password: hashedPassword,
      fullName: 'Admin User',
      name: 'Admin User',
    },
  });

  console.log('User created:', user.email);

  // Create workspace for the user
  const workspace = await prisma.workspace.upsert({
    where: { id: 'demo-workspace' },
    update: {},
    create: {
      id: 'demo-workspace',
      name: 'Demo Clinic',
      ownerId: user.id,
    },
  });

  console.log('Workspace created:', workspace.name);

  // Create example data for workspace
  await createExampleData(prisma, workspace.id);

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
