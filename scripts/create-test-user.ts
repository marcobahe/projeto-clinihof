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
      
      // Create user with workspace
      const user = await prisma.user.create({
        data: {
          email: 'john@doe.com',
          password: bcrypt.hashSync('johndoe123', 10),
          name: 'John Doe',
          fullName: 'John Doe',
          workspaces: {
            create: {
              name: 'Clínica John Doe',
            }
          }
        },
        include: {
          workspaces: true
        }
      });
      
      console.log('User created successfully!');
      console.log('User ID:', user.id);
      console.log('Workspace ID:', user.workspaces[0].id);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
