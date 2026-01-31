import { prisma } from '@/lib/db';

export async function seedWorkspaceData(workspaceId: string) {
  try {
    console.log(`Creating example data for workspace ${workspaceId}...`);

    // Criar 3 procedimentos de exemplo
    await prisma.procedure.createMany({
      data: [
        { 
          name: 'Botox', 
          price: 800, 
          duration: 30, 
          workspaceId,
          fixedCost: 0
        },
        { 
          name: 'Preenchimento Labial', 
          price: 1200, 
          duration: 45, 
          workspaceId,
          fixedCost: 0
        },
        { 
          name: 'Harmonização Facial', 
          price: 2500, 
          duration: 90, 
          workspaceId,
          fixedCost: 0
        },
      ]
    });

    // Criar 2 colaboradores de exemplo
    await prisma.collaborator.createMany({
      data: [
        { 
          name: 'Dr. Exemplo', 
          role: 'Médico', 
          commissionType: 'PERCENTAGE',
          commissionValue: 30, 
          workspaceId,
          baseSalary: 0,
          charges: 0,
          monthlyHours: 160
        },
        { 
          name: 'Ana Exemplo', 
          role: 'Esteticista', 
          commissionType: 'PERCENTAGE',
          commissionValue: 20, 
          workspaceId,
          baseSalary: 0,
          charges: 0,
          monthlyHours: 160
        },
      ]
    });

    // Criar 3 pacientes de exemplo
    await prisma.patient.createMany({
      data: [
        { 
          name: 'Maria Silva', 
          email: 'maria@exemplo.com', 
          phone: '(11) 99999-0001', 
          workspaceId 
        },
        { 
          name: 'João Santos', 
          email: 'joao@exemplo.com', 
          phone: '(11) 99999-0002', 
          workspaceId 
        },
        { 
          name: 'Ana Oliveira', 
          email: 'ana@exemplo.com', 
          phone: '(11) 99999-0003', 
          workspaceId 
        },
      ]
    });

    console.log('Example data created successfully!');
  } catch (error) {
    console.error('Error creating example data:', error);
    throw error;
  }
}