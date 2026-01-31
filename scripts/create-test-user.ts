import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  try {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'john@doe.com' }
    });

    if (existingUser) {
      console.log('User already exists. Updating password...');
      await prisma.user.update({
        where: { email: 'john@doe.com' },
        data: {
          password: bcrypt.hashSync('johndoe123', 10)
        }
      });
      console.log('Password updated successfully!');
    } else {
      console.log('Creating new user and workspace...');

      // Create workspace first
      const workspace = await prisma.workspace.create({
        data: {
          name: 'Clínica John Doe',
          owner: {
            create: {
              email: 'john@doe.com',
              password: bcrypt.hashSync('johndoe123', 10),
              name: 'John Doe',
              fullName: 'John Doe',
            }
          }
        },
        include: {
          owner: true,
        }
      });

      console.log('User created successfully!');
      console.log('User ID:', workspace.owner.id);
      console.log('Workspace ID:', workspace.id);

      // Link user to workspace
      await prisma.user.update({
        where: { id: workspace.owner.id },
        data: { workspaceId: workspace.id }
      });
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
