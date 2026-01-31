import { PrismaClient } from '@prisma/client';

/**
 * Creates example data for a workspace
 * This function is called when:
 * 1. A new user signs up (automatically)
 * 2. Running the seed script (for existing workspaces)
 */
export async function createExampleData(
  prisma: PrismaClient,
  workspaceId: string
) {
  console.log(`Creating example data for workspace ${workspaceId}...`);

  // ========== CREATE SUPPLIES (INSUMOS) ==========
  const suppliesData = [
    { name: 'Toxina Botulínica (50U)', unit: 'Frasco', costPerUnit: 450.0, stockQty: 10, minStock: 3 },
    { name: 'Ácido Hialurônico (1ml)', unit: 'Seringa', costPerUnit: 300.0, stockQty: 8, minStock: 2 },
    { name: 'Luvas Descartáveis', unit: 'Par', costPerUnit: 0.5, stockQty: 200, minStock: 50 },
    { name: 'Gaze Estéril', unit: 'Pacote', costPerUnit: 0.2, stockQty: 150, minStock: 30 },
    { name: 'Anestésico Tópico', unit: 'Aplicação', costPerUnit: 5.0, stockQty: 50, minStock: 10 },
    { name: 'Máscara Facial', unit: 'Unidade', costPerUnit: 1.5, stockQty: 100, minStock: 20 },
    { name: 'Sérum Vitamina C', unit: 'ml', costPerUnit: 8.0, stockQty: 100, minStock: 20 },
    { name: 'Ácido Glicólico', unit: 'ml', costPerUnit: 5.0, stockQty: 150, minStock: 30 },
    { name: 'Agulha Microagulhamento', unit: 'Unidade', costPerUnit: 25.0, stockQty: 30, minStock: 10 },
    { name: 'Óleo de Massagem', unit: 'ml', costPerUnit: 2.0, stockQty: 500, minStock: 100 },
  ];

  const createdSupplies: Record<string, any> = {};
  for (const supply of suppliesData) {
    const created = await prisma.supply.upsert({
      where: {
        workspaceId_name_unit: {
          workspaceId,
          name: supply.name,
          unit: supply.unit,
        },
      },
      update: {
        costPerUnit: supply.costPerUnit,
        stockQty: supply.stockQty,
        minStock: supply.minStock,
      },
      create: {
        ...supply,
        workspaceId,
      },
    });
    createdSupplies[supply.name] = created;
  }

  console.log(`Created/updated ${suppliesData.length} supplies`);

  // ========== CREATE COLLABORATORS ==========
  const collaboratorsData = [
    {
      name: 'Dra. Maria Fernanda',
      cpf: '123.456.789-00',
      rg: '12.345.678-9',
      birthDate: new Date('1985-03-15'),
      phone: '(11) 98765-4321',
      email: 'maria.fernanda@clinica.com',
      address: 'Rua das Flores, 123',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01234-567',
      role: 'Médico(a)',
      admissionDate: new Date('2020-01-10'),
      baseSalary: 8000.0,
      commissionType: 'PERCENTAGE' as const,
      commissionValue: 10,
      charges: 2500.0,
      monthlyHours: 160,
    },
    {
      name: 'Ana Paula',
      cpf: '234.567.890-11',
      phone: '(11) 97654-3210',
      email: 'ana.paula@clinica.com',
      city: 'São Paulo',
      state: 'SP',
      role: 'Esteticista',
      admissionDate: new Date('2021-05-20'),
      baseSalary: 3500.0,
      commissionType: 'PERCENTAGE' as const,
      commissionValue: 5,
      charges: 1000.0,
      monthlyHours: 176,
    },
    {
      name: 'Carla Oliveira',
      cpf: '345.678.901-22',
      phone: '(11) 96543-2109',
      email: 'carla.oliveira@clinica.com',
      role: 'Esteticista',
      admissionDate: new Date('2021-08-01'),
      baseSalary: 3200.0,
      commissionType: 'FIXED' as const,
      commissionValue: 800.0,
      charges: 900.0,
      monthlyHours: 176,
    },
    {
      name: 'Júlia Santos',
      cpf: '456.789.012-33',
      phone: '(11) 95432-1098',
      role: 'Assistente',
      admissionDate: new Date('2022-02-15'),
      baseSalary: 2000.0,
      commissionType: 'PERCENTAGE' as const,
      commissionValue: 0,
      charges: 600.0,
      monthlyHours: 176,
    },
    {
      name: 'Roberto Lima',
      cpf: '567.890.123-44',
      phone: '(11) 94321-0987',
      email: 'roberto.lima@clinica.com',
      role: 'Fisioterapeuta',
      admissionDate: new Date('2020-06-01'),
      baseSalary: 4000.0,
      commissionType: 'PERCENTAGE' as const,
      commissionValue: 8,
      charges: 1200.0,
      monthlyHours: 160,
    },
  ];

  const createdCollaborators: Record<string, any> = {};
  for (const collaborator of collaboratorsData) {
    // Check if collaborator already exists
    const existing = await prisma.collaborator.findFirst({
      where: {
        workspaceId,
        name: collaborator.name,
        email: collaborator.email,
      },
    });

    let created;
    if (existing) {
      // Update existing collaborator
      created = await prisma.collaborator.update({
        where: { id: existing.id },
        data: {
          ...collaborator,
          workspaceId,
        },
      });
      console.log(`Updated existing collaborator: ${collaborator.name}`);
    } else {
      // Create new collaborator
      created = await prisma.collaborator.create({
        data: {
          ...collaborator,
          workspaceId,
        },
      });
      console.log(`Created new collaborator: ${collaborator.name}`);
    }
    
    createdCollaborators[collaborator.name] = created;
  }

  console.log(`Processed ${collaboratorsData.length} collaborators`);

  // ========== CREATE PATIENTS ==========
  const patientsData = [
    {
      name: 'Maria Silva',
      email: 'maria.silva@email.com',
      phone: '(11) 98765-4321',
      notes: 'Paciente regular, prefere atendimentos pela manhã',
    },
    {
      name: 'João Santos',
      email: 'joao.santos@email.com',
      phone: '(11) 97654-3210',
      notes: 'Primeira consulta agendada',
    },
    {
      name: 'Ana Costa',
      email: null,
      phone: '(11) 96543-2109',
      notes: 'Recomendação de amiga',
    },
    {
      name: 'Pedro Oliveira',
      email: 'pedro.oliveira@email.com',
      phone: '(11) 95432-1098',
      notes: null,
    },
    {
      name: 'Carla Mendes',
      email: 'carla.mendes@email.com',
      phone: '(11) 94321-0987',
      notes: 'Paciente VIP',
    },
  ];

  const createdPatients = [];
  for (const patient of patientsData) {
    const created = await prisma.patient.upsert({
      where: {
        workspaceId_name_phone: {
          workspaceId,
          name: patient.name,
          phone: patient.phone,
        },
      },
      update: {
        email: patient.email,
        notes: patient.notes,
      },
      create: {
        ...patient,
        workspaceId,
      },
    });
    createdPatients.push(created);
  }

  console.log(`Created/updated ${patientsData.length} patients`);

  // ========== CREATE PROCEDURES ==========
  // Procedure 1: Limpeza de Pele
  const limpezaPele = await prisma.procedure.create({
    data: {
      name: 'Limpeza de Pele',
      price: 150.0,
      duration: 60,
      workspaceId,
      supplies: {
        create: [
          { supplyId: createdSupplies['Luvas Descartáveis'].id, quantity: 2 },
          { supplyId: createdSupplies['Gaze Estéril'].id, quantity: 3 },
          { supplyId: createdSupplies['Máscara Facial'].id, quantity: 1 },
          { supplyId: createdSupplies['Sérum Vitamina C'].id, quantity: 5 },
        ],
      },
      collaborators: {
        create: [
          { collaboratorId: createdCollaborators['Ana Paula'].id, timeMinutes: 60 },
        ],
      },
    },
  });

  // Procedure 2: Peeling Químico
  const peelingQuimico = await prisma.procedure.create({
    data: {
      name: 'Peeling Químico',
      price: 280.0,
      duration: 45,
      workspaceId,
      supplies: {
        create: [
          { supplyId: createdSupplies['Luvas Descartáveis'].id, quantity: 2 },
          { supplyId: createdSupplies['Gaze Estéril'].id, quantity: 2 },
          { supplyId: createdSupplies['Ácido Glicólico'].id, quantity: 10 },
        ],
      },
      collaborators: {
        create: [
          { collaboratorId: createdCollaborators['Ana Paula'].id, timeMinutes: 45 },
        ],
      },
    },
  });

  // Procedure 3: Microagulhamento
  const microagulhamento = await prisma.procedure.create({
    data: {
      name: 'Microagulhamento',
      price: 350.0,
      duration: 90,
      workspaceId,
      supplies: {
        create: [
          { supplyId: createdSupplies['Luvas Descartáveis'].id, quantity: 3 },
          { supplyId: createdSupplies['Gaze Estéril'].id, quantity: 4 },
          { supplyId: createdSupplies['Anestésico Tópico'].id, quantity: 2 },
          { supplyId: createdSupplies['Agulha Microagulhamento'].id, quantity: 1 },
          { supplyId: createdSupplies['Sérum Vitamina C'].id, quantity: 10 },
        ],
      },
      collaborators: {
        create: [
          { collaboratorId: createdCollaborators['Carla Oliveira'].id, timeMinutes: 90 },
        ],
      },
    },
  });

  // Procedure 4: Botox
  const botox = await prisma.procedure.create({
    data: {
      name: 'Botox',
      price: 800.0,
      duration: 30,
      workspaceId,
      supplies: {
        create: [
          { supplyId: createdSupplies['Toxina Botulínica (50U)'].id, quantity: 1 },
          { supplyId: createdSupplies['Luvas Descartáveis'].id, quantity: 2 },
          { supplyId: createdSupplies['Gaze Estéril'].id, quantity: 2 },
          { supplyId: createdSupplies['Anestésico Tópico'].id, quantity: 1 },
        ],
      },
      collaborators: {
        create: [
          { collaboratorId: createdCollaborators['Dra. Maria Fernanda'].id, timeMinutes: 30 },
          { collaboratorId: createdCollaborators['Júlia Santos'].id, timeMinutes: 15 },
        ],
      },
    },
  });

  // Procedure 5: Preenchimento Labial
  const preenchimentoLabial = await prisma.procedure.create({
    data: {
      name: 'Preenchimento Labial',
      price: 1200.0,
      duration: 60,
      workspaceId,
      supplies: {
        create: [
          { supplyId: createdSupplies['Ácido Hialurônico (1ml)'].id, quantity: 1 },
          { supplyId: createdSupplies['Luvas Descartáveis'].id, quantity: 3 },
          { supplyId: createdSupplies['Gaze Estéril'].id, quantity: 3 },
          { supplyId: createdSupplies['Anestésico Tópico'].id, quantity: 2 },
        ],
      },
      collaborators: {
        create: [
          { collaboratorId: createdCollaborators['Dra. Maria Fernanda'].id, timeMinutes: 45 },
          { collaboratorId: createdCollaborators['Júlia Santos'].id, timeMinutes: 30 },
        ],
      },
    },
  });

  // Procedure 6: Harmonização Facial
  const harmonizacaoFacial = await prisma.procedure.create({
    data: {
      name: 'Harmonização Facial',
      price: 2500.0,
      duration: 120,
      workspaceId,
      supplies: {
        create: [
          { supplyId: createdSupplies['Ácido Hialurônico (1ml)'].id, quantity: 3 },
          { supplyId: createdSupplies['Toxina Botulínica (50U)'].id, quantity: 1 },
          { supplyId: createdSupplies['Luvas Descartáveis'].id, quantity: 4 },
          { supplyId: createdSupplies['Gaze Estéril'].id, quantity: 5 },
          { supplyId: createdSupplies['Anestésico Tópico'].id, quantity: 4 },
        ],
      },
      collaborators: {
        create: [
          { collaboratorId: createdCollaborators['Dra. Maria Fernanda'].id, timeMinutes: 120 },
          { collaboratorId: createdCollaborators['Júlia Santos'].id, timeMinutes: 60 },
        ],
      },
    },
  });

  // Procedure 7: Massagem Modeladora
  const massagemModeladora = await prisma.procedure.create({
    data: {
      name: 'Massagem Modeladora',
      price: 200.0,
      duration: 60,
      workspaceId,
      supplies: {
        create: [
          { supplyId: createdSupplies['Óleo de Massagem'].id, quantity: 30 },
          { supplyId: createdSupplies['Luvas Descartáveis'].id, quantity: 1 },
        ],
      },
      collaborators: {
        create: [
          { collaboratorId: createdCollaborators['Roberto Lima'].id, timeMinutes: 60 },
        ],
      },
    },
  });

  // Procedure 8: Drenagem Linfática
  const drenagemLinfatica = await prisma.procedure.create({
    data: {
      name: 'Drenagem Linfática',
      price: 180.0,
      duration: 60,
      workspaceId,
      supplies: {
        create: [
          { supplyId: createdSupplies['Óleo de Massagem'].id, quantity: 20 },
          { supplyId: createdSupplies['Luvas Descartáveis'].id, quantity: 1 },
        ],
      },
      collaborators: {
        create: [
          { collaboratorId: createdCollaborators['Roberto Lima'].id, timeMinutes: 60 },
        ],
      },
    },
  });

  const createdProcedures = [
    limpezaPele,
    peelingQuimico,
    microagulhamento,
    botox,
    preenchimentoLabial,
    harmonizacaoFacial,
    massagemModeladora,
    drenagemLinfatica,
  ];

  console.log(`Created ${createdProcedures.length} procedures with supplies and collaborators`);

  // ========== CREATE SALES WITH SESSIONS ==========
  const now = new Date();
  
  // Helper function to get random seller ID
  const collaboratorIds = Object.values(createdCollaborators).map(c => c.id);
  const getRandomSellerId = () => collaboratorIds[Math.floor(Math.random() * collaboratorIds.length)];
  
  // Sale 1: Ana Costa - Pacote de Limpeza de Pele (1 sessão realizada de 8)
  if (createdPatients[2] && createdProcedures[0]) {
    const sale1 = await prisma.sale.create({
      data: {
        workspaceId,
        patientId: createdPatients[2].id,
        sellerId: getRandomSellerId(),
        saleDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30),
        totalAmount: 1200.0,
        paymentMethod: 'CASH_PIX',
        installments: 1,
        paymentStatus: 'PAID',
        notes: 'Pacote de 8 sessões',
        items: {
          create: [
            {
              procedureId: createdProcedures[0].id,
              quantity: 8,
              unitPrice: 150.0,
            },
          ],
        },
      },
    });

    // Helper function to generate realistic time
    const getRandomTime = () => {
      const hours = 8 + Math.floor(Math.random() * 10); // 8-17h
      const minutes = Math.random() < 0.5 ? 0 : 30; // :00 or :30
      return { hours, minutes };
    };

    // Create 8 sessions - 1 completed, 7 pending
    const { hours: h1, minutes: m1 } = getRandomTime();
    const scheduledDate1 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 25);
    scheduledDate1.setHours(h1, m1, 0, 0);
    
    await prisma.procedureSession.create({
      data: {
        saleId: sale1.id,
        procedureId: createdProcedures[0].id,
        scheduledDate: scheduledDate1,
        completedDate: scheduledDate1,
        status: 'COMPLETED',
        notes: 'Primeira sessão realizada',
      },
    });

    for (let i = 0; i < 7; i++) {
      await prisma.procedureSession.create({
        data: {
          saleId: sale1.id,
          procedureId: createdProcedures[0].id,
          status: 'PENDING',
        },
      });
    }
  }

  // Sale 2: Pedro Oliveira - Peeling Químico (1 sessão realizada de 1)
  if (createdPatients[3] && createdProcedures[1]) {
    const sale2 = await prisma.sale.create({
      data: {
        workspaceId,
        patientId: createdPatients[3].id,
        sellerId: getRandomSellerId(),
        saleDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 15),
        totalAmount: 280.0,
        paymentMethod: 'CASH_PIX',
        installments: 1,
        paymentStatus: 'PAID',
        items: {
          create: [
            {
              procedureId: createdProcedures[1].id,
              quantity: 1,
              unitPrice: 280.0,
            },
          ],
        },
      },
    });

    const { hours: h2, minutes: m2 } = getRandomTime();
    const scheduledDate2 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 10);
    scheduledDate2.setHours(h2, m2, 0, 0);
    
    await prisma.procedureSession.create({
      data: {
        saleId: sale2.id,
        procedureId: createdProcedures[1].id,
        scheduledDate: scheduledDate2,
        completedDate: scheduledDate2,
        status: 'COMPLETED',
      },
    });
  }

  // Sale 3: Ana Costa - Massagem Modeladora (3 sessões pendentes)
  if (createdPatients[2] && createdProcedures[6]) {
    const sale3 = await prisma.sale.create({
      data: {
        workspaceId,
        patientId: createdPatients[2].id,
        sellerId: getRandomSellerId(),
        saleDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 5),
        totalAmount: 600.0,
        paymentMethod: 'CREDIT_CARD',
        installments: 3,
        paymentStatus: 'PARTIAL',
        notes: 'Massagem Modeladora - Pacote 3x',
        items: {
          create: [
            {
              procedureId: createdProcedures[6].id,
              quantity: 3,
              unitPrice: 200.0,
            },
          ],
        },
      },
    });

    // 3 sessões pendentes
    for (let i = 0; i < 3; i++) {
      await prisma.procedureSession.create({
        data: {
          saleId: sale3.id,
          procedureId: createdProcedures[6].id,
          status: 'PENDING',
        },
      });
    }
  }

  // Sale 4: Maria Silva - Drenagem Linfática (3 sessões pendentes)
  if (createdPatients[0] && createdProcedures[7]) {
    const sale4 = await prisma.sale.create({
      data: {
        workspaceId,
        patientId: createdPatients[0].id,
        sellerId: getRandomSellerId(),
        saleDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2),
        totalAmount: 540.0,
        paymentMethod: 'CASH_PIX',
        installments: 1,
        paymentStatus: 'PAID',
        items: {
          create: [
            {
              procedureId: createdProcedures[7].id,
              quantity: 3,
              unitPrice: 180.0,
            },
          ],
        },
      },
    });

    // 3 sessões pendentes
    for (let i = 0; i < 3; i++) {
      await prisma.procedureSession.create({
        data: {
          saleId: sale4.id,
          procedureId: createdProcedures[7].id,
          status: 'PENDING',
        },
      });
    }
  }

  // Sale 5: Maria Silva - Botox + Preenchimento (completado)
  if (createdPatients[0] && createdProcedures[3] && createdProcedures[4]) {
    const sale5 = await prisma.sale.create({
      data: {
        workspaceId,
        patientId: createdPatients[0].id,
        sellerId: getRandomSellerId(),
        saleDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 60),
        totalAmount: 2000.0,
        paymentMethod: 'CREDIT_CARD',
        installments: 4,
        paymentStatus: 'PAID',
        items: {
          create: [
            {
              procedureId: createdProcedures[3].id,
              quantity: 1,
              unitPrice: 800.0,
            },
            {
              procedureId: createdProcedures[4].id,
              quantity: 1,
              unitPrice: 1200.0,
            },
          ],
        },
      },
    });

    const { hours: h5a, minutes: m5a } = getRandomTime();
    const scheduledDate5a = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 55);
    scheduledDate5a.setHours(h5a, m5a, 0, 0);
    
    await prisma.procedureSession.create({
      data: {
        saleId: sale5.id,
        procedureId: createdProcedures[3].id,
        scheduledDate: scheduledDate5a,
        completedDate: scheduledDate5a,
        status: 'COMPLETED',
      },
    });

    const { hours: h5b, minutes: m5b } = getRandomTime();
    const scheduledDate5b = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 55);
    scheduledDate5b.setHours(h5b, m5b, 0, 0);
    
    await prisma.procedureSession.create({
      data: {
        saleId: sale5.id,
        procedureId: createdProcedures[4].id,
        scheduledDate: scheduledDate5b,
        completedDate: scheduledDate5b,
        status: 'COMPLETED',
      },
    });
  }

  // Sale 6: João Santos - Harmonização Facial (completado)
  if (createdPatients[1] && createdProcedures[5]) {
    const sale6 = await prisma.sale.create({
      data: {
        workspaceId,
        patientId: createdPatients[1].id,
        sellerId: getRandomSellerId(),
        saleDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 45),
        totalAmount: 2500.0,
        paymentMethod: 'BANK_SLIP',
        installments: 1,
        paymentStatus: 'PAID',
        items: {
          create: [
            {
              procedureId: createdProcedures[5].id,
              quantity: 1,
              unitPrice: 2500.0,
            },
          ],
        },
      },
    });

    const { hours: h6, minutes: m6 } = getRandomTime();
    const scheduledDate6 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 40);
    scheduledDate6.setHours(h6, m6, 0, 0);
    
    await prisma.procedureSession.create({
      data: {
        saleId: sale6.id,
        procedureId: createdProcedures[5].id,
        scheduledDate: scheduledDate6,
        completedDate: scheduledDate6,
        status: 'COMPLETED',
      },
    });
  }

  // ========== CREATE FUTURE SESSIONS ==========
  // Add some future sessions with realistic times
  
  // Future session 1: Maria Silva - Limpeza de Pele (agendamento futuro)
  if (createdPatients[0] && createdProcedures[0]) {
    const { hours: hf1, minutes: mf1 } = getRandomTime();
    const futureDate1 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5);
    futureDate1.setHours(hf1, mf1, 0, 0);
    
    const futureSale1 = await prisma.sale.create({
      data: {
        workspaceId,
        patientId: createdPatients[0].id,
        sellerId: getRandomSellerId(),
        saleDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
        totalAmount: 150.0,
        paymentMethod: 'CASH_PIX',
        installments: 1,
        paymentStatus: 'PAID',
        notes: 'Agendamento futuro - limpeza de pele',
        items: {
          create: [
            {
              procedureId: createdProcedures[0].id,
              quantity: 1,
              unitPrice: 150.0,
            },
          ],
        },
      },
    });

    await prisma.procedureSession.create({
      data: {
        saleId: futureSale1.id,
        procedureId: createdProcedures[0].id,
        scheduledDate: futureDate1,
        status: 'PENDING',
        notes: 'Sessão agendada para próxima semana',
      },
    });
  }

  // Future session 2: João Santos - Microagulhamento (agendamento futuro)
  if (createdPatients[1] && createdProcedures[2]) {
    const { hours: hf2, minutes: mf2 } = getRandomTime();
    const futureDate2 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 12);
    futureDate2.setHours(hf2, mf2, 0, 0);
    
    const futureSale2 = await prisma.sale.create({
      data: {
        workspaceId,
        patientId: createdPatients[1].id,
        sellerId: getRandomSellerId(),
        saleDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3),
        totalAmount: 350.0,
        paymentMethod: 'CREDIT_CARD',
        installments: 2,
        paymentStatus: 'PARTIAL',
        notes: 'Microagulhamento - sessão única',
        items: {
          create: [
            {
              procedureId: createdProcedures[2].id,
              quantity: 1,
              unitPrice: 350.0,
            },
          ],
        },
      },
    });

    await prisma.procedureSession.create({
      data: {
        saleId: futureSale2.id,
        procedureId: createdProcedures[2].id,
        scheduledDate: futureDate2,
        status: 'PENDING',
        notes: 'Primeira sessão de microagulhamento',
      },
    });
  }

  // Future session 3: Carla Mendes - Drenagem Linfática (3 sessões futuras)
  if (createdPatients[4] && createdProcedures[7]) {
    const futureSale3 = await prisma.sale.create({
      data: {
        workspaceId,
        patientId: createdPatients[4].id,
        sellerId: getRandomSellerId(),
        saleDate: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        totalAmount: 540.0,
        paymentMethod: 'CASH_PIX',
        installments: 1,
        paymentStatus: 'PAID',
        notes: 'Pacote 3 sessões drenagem - todas futuras',
        items: {
          create: [
            {
              procedureId: createdProcedures[7].id,
              quantity: 3,
              unitPrice: 180.0,
            },
          ],
        },
      },
    });

    // Create 3 future sessions at different dates
    for (let i = 0; i < 3; i++) {
      const { hours: hf, minutes: mf } = getRandomTime();
      const futureDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7 + (i * 7));
      futureDate.setHours(hf, mf, 0, 0);
      
      await prisma.procedureSession.create({
        data: {
          saleId: futureSale3.id,
          procedureId: createdProcedures[7].id,
          scheduledDate: futureDate,
          status: 'PENDING',
          notes: `Sessão ${i + 1} de drenagem linfática`,
        },
      });
    }
  }

  // Future session 4: Pedro Oliveira - Harmonização Facial (agendamento futuro VIP)
  if (createdPatients[3] && createdProcedures[5]) {
    const { hours: hf4, minutes: mf4 } = getRandomTime();
    const futureDate4 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 20);
    futureDate4.setHours(hf4, mf4, 0, 0);
    
    const futureSale4 = await prisma.sale.create({
      data: {
        workspaceId,
        patientId: createdPatients[3].id,
        sellerId: getRandomSellerId(),
        saleDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2),
        totalAmount: 2500.0,
        paymentMethod: 'BANK_SLIP',
        installments: 1,
        paymentStatus: 'PENDING',
        notes: 'Harmonização facial - agendamento especial',
        items: {
          create: [
            {
              procedureId: createdProcedures[5].id,
              quantity: 1,
              unitPrice: 2500.0,
            },
          ],
        },
      },
    });

    await prisma.procedureSession.create({
      data: {
        saleId: futureSale4.id,
        procedureId: createdProcedures[5].id,
        scheduledDate: futureDate4,
        status: 'PENDING',
        notes: 'Harmonização facial completa',
      },
    });
  }

  console.log('Created 6 original sales + 4 future sales with sessions');

  // ========== CREATE PACKAGES (PACOTES) ==========
  const packagesData = [
    {
      name: 'Protocolo Noiva Completo',
      finalPrice: 1800.0,
      items: [
        { procedureId: createdProcedures[0].id, quantity: 3 }, // Botox
        { procedureId: createdProcedures[1].id, quantity: 2 }, // Preenchimento
        { procedureId: createdProcedures[2].id, quantity: 4 }, // Limpeza de Pele
      ],
    },
    {
      name: 'Pacote Rejuvenescimento',
      finalPrice: 2500.0,
      items: [
        { procedureId: createdProcedures[0].id, quantity: 2 }, // Botox
        { procedureId: createdProcedures[1].id, quantity: 3 }, // Preenchimento
        { procedureId: createdProcedures[3].id, quantity: 2 }, // Peeling Químico
      ],
    },
    {
      name: 'Tratamento Corporal Completo',
      finalPrice: 1200.0,
      items: [
        { procedureId: createdProcedures[4].id, quantity: 8 }, // Drenagem Linfática
        { procedureId: createdProcedures[5].id, quantity: 4 }, // Massagem Modeladora
      ],
    },
  ];

  for (const pkg of packagesData) {
    // Calcular standalone price
    const standalonePriceTotal = pkg.items.reduce((sum, item) => {
      const proc = createdProcedures.find((p: any) => p.id === item.procedureId);
      return sum + (proc ? proc.price * item.quantity : 0);
    }, 0);

    // Calcular desconto percentual
    const discountPercent =
      standalonePriceTotal > 0
        ? ((standalonePriceTotal - pkg.finalPrice) / standalonePriceTotal) * 100
        : 0;

    await prisma.package.create({
      data: {
        workspaceId,
        name: pkg.name,
        finalPrice: pkg.finalPrice,
        discountPercent: discountPercent,
        items: {
          create: pkg.items,
        },
      },
    });
  }

  console.log(`Created ${packagesData.length} packages`);

  // ========== CREATE COSTS (CUSTOS FIXOS) ==========
  const costsData = [
    {
      description: 'Aluguel Clínica',
      costType: 'FIXED' as const,
      category: 'OPERATIONAL' as const,
      fixedValue: 2800.0,
      percentage: null,
      paymentDate: new Date('2025-12-10'),
      isRecurring: true,
    },
    {
      description: 'Energia Elétrica',
      costType: 'FIXED' as const,
      category: 'OPERATIONAL' as const,
      fixedValue: 450.0,
      percentage: null,
      paymentDate: new Date('2025-12-15'),
      isRecurring: true,
    },
    {
      description: 'Internet / Telefone',
      costType: 'FIXED' as const,
      category: 'OPERATIONAL' as const,
      fixedValue: 180.0,
      percentage: null,
      paymentDate: new Date('2025-12-05'),
      isRecurring: true,
    },
    {
      description: 'Software de Gestão',
      costType: 'FIXED' as const,
      category: 'OPERATIONAL' as const,
      fixedValue: 99.9,
      percentage: null,
      paymentDate: null,
      isRecurring: true,
    },
    {
      description: 'Água e Gás',
      costType: 'FIXED' as const,
      category: 'OPERATIONAL' as const,
      fixedValue: 150.0,
      percentage: null,
      paymentDate: new Date('2025-12-20'),
      isRecurring: true,
    },
    {
      description: 'Material de Limpeza',
      costType: 'FIXED' as const,
      category: 'OPERATIONAL' as const,
      fixedValue: 350.0,
      percentage: null,
      paymentDate: null,
      isRecurring: true,
    },
    {
      description: 'Imposto ICMS',
      costType: 'PERCENTAGE' as const,
      category: 'TAX' as const,
      fixedValue: null,
      percentage: 8.5,
      paymentDate: null,
      isRecurring: true,
    },
    {
      description: 'Imposto ISS',
      costType: 'PERCENTAGE' as const,
      category: 'TAX' as const,
      fixedValue: null,
      percentage: 5.0,
      paymentDate: null,
      isRecurring: true,
    },
    {
      description: 'Taxa Maquininha Débito',
      costType: 'PERCENTAGE' as const,
      category: 'CARD' as const,
      fixedValue: null,
      percentage: 1.5,
      paymentDate: null,
      isRecurring: true,
    },
    {
      description: 'Taxa Maquininha Crédito',
      costType: 'PERCENTAGE' as const,
      category: 'CARD' as const,
      fixedValue: null,
      percentage: 3.5,
      paymentDate: null,
      isRecurring: true,
    },
  ];

  for (const cost of costsData) {
    await prisma.cost.create({
      data: {
        ...cost,
        workspaceId,
      },
    });
  }

  console.log(`Created ${costsData.length} costs`);

  // Create card fee rules with different operators and rates
  const cardFeeRules = [
    // Rede - Crédito (1x a 12x)
    { cardOperator: 'Rede', cardType: 'CREDIT', installmentCount: 1, feePercentage: 2.5, receivingDays: 30 },
    { cardOperator: 'Rede', cardType: 'CREDIT', installmentCount: 2, feePercentage: 3.0, receivingDays: 30 },
    { cardOperator: 'Rede', cardType: 'CREDIT', installmentCount: 3, feePercentage: 3.2, receivingDays: 30 },
    { cardOperator: 'Rede', cardType: 'CREDIT', installmentCount: 4, feePercentage: 3.4, receivingDays: 30 },
    { cardOperator: 'Rede', cardType: 'CREDIT', installmentCount: 5, feePercentage: 3.6, receivingDays: 30 },
    { cardOperator: 'Rede', cardType: 'CREDIT', installmentCount: 6, feePercentage: 3.8, receivingDays: 30 },
    { cardOperator: 'Rede', cardType: 'CREDIT', installmentCount: 7, feePercentage: 4.0, receivingDays: 30 },
    { cardOperator: 'Rede', cardType: 'CREDIT', installmentCount: 8, feePercentage: 4.2, receivingDays: 30 },
    { cardOperator: 'Rede', cardType: 'CREDIT', installmentCount: 9, feePercentage: 4.4, receivingDays: 30 },
    { cardOperator: 'Rede', cardType: 'CREDIT', installmentCount: 10, feePercentage: 4.6, receivingDays: 30 },
    { cardOperator: 'Rede', cardType: 'CREDIT', installmentCount: 11, feePercentage: 4.8, receivingDays: 30 },
    { cardOperator: 'Rede', cardType: 'CREDIT', installmentCount: 12, feePercentage: 5.0, receivingDays: 30 },
    // Rede - Débito
    { cardOperator: 'Rede', cardType: 'DEBIT', installmentCount: 1, feePercentage: 1.99, receivingDays: 1 },
    // Stone - Crédito (1x a 12x)
    { cardOperator: 'Stone', cardType: 'CREDIT', installmentCount: 1, feePercentage: 2.75, receivingDays: 31 },
    { cardOperator: 'Stone', cardType: 'CREDIT', installmentCount: 2, feePercentage: 3.2, receivingDays: 31 },
    { cardOperator: 'Stone', cardType: 'CREDIT', installmentCount: 3, feePercentage: 3.4, receivingDays: 31 },
    { cardOperator: 'Stone', cardType: 'CREDIT', installmentCount: 4, feePercentage: 3.6, receivingDays: 31 },
    { cardOperator: 'Stone', cardType: 'CREDIT', installmentCount: 5, feePercentage: 3.8, receivingDays: 31 },
    { cardOperator: 'Stone', cardType: 'CREDIT', installmentCount: 6, feePercentage: 4.0, receivingDays: 31 },
    { cardOperator: 'Stone', cardType: 'CREDIT', installmentCount: 7, feePercentage: 4.3, receivingDays: 31 },
    { cardOperator: 'Stone', cardType: 'CREDIT', installmentCount: 8, feePercentage: 4.5, receivingDays: 31 },
    { cardOperator: 'Stone', cardType: 'CREDIT', installmentCount: 9, feePercentage: 4.7, receivingDays: 31 },
    { cardOperator: 'Stone', cardType: 'CREDIT', installmentCount: 10, feePercentage: 4.9, receivingDays: 31 },
    { cardOperator: 'Stone', cardType: 'CREDIT', installmentCount: 11, feePercentage: 5.1, receivingDays: 31 },
    { cardOperator: 'Stone', cardType: 'CREDIT', installmentCount: 12, feePercentage: 5.3, receivingDays: 31 },
    // Stone - Débito
    { cardOperator: 'Stone', cardType: 'DEBIT', installmentCount: 1, feePercentage: 1.59, receivingDays: 2 },
  ];

  for (const rule of cardFeeRules) {
    await prisma.cardFeeRule.create({
      data: {
        ...rule,
        workspaceId,
      },
    });
  }

  console.log(`Created ${cardFeeRules.length} card fee rules`);


  console.log('Example data creation completed!');
}
