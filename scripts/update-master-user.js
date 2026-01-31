const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateMasterUser() {
  try {
    console.log('Updating user admin@clinihof.com to MASTER role...');
    
    const user = await prisma.user.update({
      where: { email: 'admin@clinihof.com' },
      data: { role: 'MASTER' }
    });
    
    console.log(`✅ Successfully updated user ${user.email} to role: ${user.role}`);
    console.log(`User details:`, {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      updatedAt: user.updatedAt
    });
    
  } catch (error) {
    if (error.code === 'P2025') {
      console.error('❌ User admin@clinihof.com not found in database');
    } else {
      console.error('❌ Error updating user:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

updateMasterUser();