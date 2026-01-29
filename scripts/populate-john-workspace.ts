import { PrismaClient } from '@prisma/client';
import { createExampleData } from '../lib/seed-data';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Populating john@doe.com workspace with comprehensive mock data...');

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

  console.log(`✅ Found workspace: ${workspace.name} (${workspace.id})`);

  // First, run the standard example data creation
  console.log('\n📦 Creating base example data...');
  await createExampleData(prisma, workspace.id);

  // Get all created data
  const patients = await prisma.patient.findMany({ where: { workspaceId: workspace.id } });
  const procedures = await prisma.procedure.findMany({ where: { workspaceId: workspace.id } });
  const collaborators = await prisma.collaborator.findMany({ where: { workspaceId: workspace.id } });

  console.log(`\n📊 Current data: ${patients.length} patients, ${procedures.length} procedures, ${collaborators.length} collaborators`);

  // ========== ADD MORE PATIENTS ==========
  console.log('\n👥 Adding more patients...');
  const morePatients = [
    { name: 'Beatriz Alves', email: 'beatriz.alves@email.com', phone: '(11) 93210-9876', notes: 'Indicação da Maria Silva' },
    { name: 'Fernanda Rocha', email: 'fernanda.rocha@email.com', phone: '(11) 92109-8765', notes: 'Primeira consulta realizada' },
    { name: 'Gabriela Martins', email: null, phone: '(11) 91098-7654', notes: 'Cliente VIP - tratamento mensal' },
    { name: 'Helena Souza', email: 'helena.souza@email.com', phone: '(11) 90987-6543', notes: 'Pacote de noiva contratado' },
    { name: 'Isabela Ferreira', email: 'isabela.ferreira@email.com', phone: '(11) 89876-5432', notes: null },
    { name: 'Juliana Costa', email: 'juliana.costa@email.com', phone: '(11) 88765-4321', notes: 'Prefere atendimento tarde' },
    { name: 'Larissa Lima', email: null, phone: '(11) 87654-3210', notes: 'Cliente desde 2022' },
    { name: 'Mariana Dias', email: 'mariana.dias@email.com', phone: '(11) 86543-2109', notes: 'Alergia a ácido glicólico' },
    { name: 'Natália Gomes', email: 'natalia.gomes@email.com', phone: '(11) 85432-1098', notes: 'Pacote rejuvenescimento' },
    { name: 'Patrícia Santos', email: 'patricia.santos@email.com', phone: '(11) 84321-0987', notes: null },
    { name: 'Ricardo Pereira', email: 'ricardo.pereira@email.com', phone: '(11) 93456-7890', notes: 'Tratamento corporal' },
    { name: 'Sérgio Campos', email: null, phone: '(11) 92345-6789', notes: 'Cliente novo - prospecção' },
    { name: 'Tiago Barbosa', email: 'tiago.barbosa@email.com', phone: '(11) 91234-5678', notes: 'Consulta de retorno agendada' },
    { name: 'Vanessa Pinto', email: 'vanessa.pinto@email.com', phone: '(11) 90123-4567', notes: 'Preenchimento labial realizado' },
    { name: 'Yara Cardoso', email: 'yara.cardoso@email.com', phone: '(11) 89012-3456', notes: 'Paciente frequente' },
  ];

  for (const patient of morePatients) {
    await prisma.patient.upsert({
      where: {
        workspaceId_name_phone: {
          workspaceId: workspace.id,
          name: patient.name,
          phone: patient.phone,
        },
      },
      update: patient,
      create: { ...patient, workspaceId: workspace.id },
    });
  }

  const allPatients = await prisma.patient.findMany({ where: { workspaceId: workspace.id } });
  console.log(`✅ Total patients: ${allPatients.length}`);

  // ========== CREATE QUOTES (ORÇAMENTOS) ==========
  console.log('\n💰 Creating quotes...');
  const quotesData = [
    {
      workspaceId: workspace.id,
      patientId: allPatients[0].id,
      collaboratorId: collaborators[0]?.id,
      title: 'Protocolo Rejuvenescimento Facial',
      totalAmount: 3500.0,
      discountPercent: 10,
      discountAmount: 350.0,
      finalAmount: 3150.0,
      status: 'ACCEPTED' as const,
      createdDate: new Date('2024-11-15'),
      sentDate: new Date('2024-11-16'),
      acceptedDate: new Date('2024-11-20'),
      leadSource: 'Instagram',
      notes: 'Cliente interessada em pacote completo',
    },
    {
      workspaceId: workspace.id,
      patientId: allPatients[1].id,
      collaboratorId: collaborators[1]?.id,
      title: 'Tratamento Capilar Completo',
      totalAmount: 1800.0,
      discountPercent: 5,
      discountAmount: 90.0,
      finalAmount: 1710.0,
      status: 'SENT' as const,
      createdDate: new Date('2024-12-01'),
      sentDate: new Date('2024-12-02'),
      leadSource: 'Google',
      notes: 'Aguardando resposta da cliente',
    },
    {
      workspaceId: workspace.id,
      patientId: allPatients[2].id,
      collaboratorId: collaborators[0]?.id,
      title: 'Harmonização Facial',
      totalAmount: 5500.0,
      discountPercent: 15,
      discountAmount: 825.0,
      finalAmount: 4675.0,
      status: 'PENDING' as const,
      createdDate: new Date('2024-12-05'),
      leadSource: 'Indicação',
      notes: 'Primeira consulta realizada',
    },
    {
      workspaceId: workspace.id,
      patientId: allPatients[3].id,
      collaboratorId: collaborators[1]?.id,
      title: 'Pacote Noiva - Completo',
      totalAmount: 4200.0,
      discountPercent: 20,
      discountAmount: 840.0,
      finalAmount: 3360.0,
      status: 'ACCEPTED' as const,
      createdDate: new Date('2024-11-10'),
      sentDate: new Date('2024-11-11'),
      acceptedDate: new Date('2024-11-12'),
      leadSource: 'Facebook',
      notes: 'Casamento em março de 2025',
    },
    {
      workspaceId: workspace.id,
      patientId: allPatients[4].id,
      collaboratorId: collaborators[0]?.id,
      title: 'Limpeza de Pele + Peeling',
      totalAmount: 430.0,
      discountPercent: 0,
      discountAmount: 0.0,
      finalAmount: 430.0,
      status: 'REJECTED' as const,
      createdDate: new Date('2024-11-25'),
      sentDate: new Date('2024-11-26'),
      rejectedDate: new Date('2024-11-30'),
      leadSource: 'WhatsApp',
      notes: 'Cliente achou valor elevado',
    },
  ];

  for (const quote of quotesData) {
    const createdQuote = await prisma.quote.create({
      data: quote,
    });

    // Add quote items
    if (procedures.length > 0) {
      await prisma.quoteItem.create({
        data: {
          quoteId: createdQuote.id,
          procedureId: procedures[0].id,
          description: procedures[0].name,
          quantity: 1,
          unitPrice: procedures[0].price,
          totalPrice: procedures[0].price,
        },
      });
    }
  }

  console.log(`✅ Created ${quotesData.length} quotes`);

  // ========== CREATE SALES WITH PAYMENT SPLITS ==========
  console.log('\n💳 Creating sales with payment splits...');
  const now = new Date();
  const salesData = [
    // Sale 1: Botox - Cash/Pix payment (immediate)
    {
      workspaceId: workspace.id,
      patientId: allPatients[0].id,
      saleDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      totalAmount: 800.0,
      paymentStatus: 'PAID' as const,
      notes: 'Pagamento à vista via Pix',
      procedureId: procedures.find(p => p.name === 'Botox')?.id || procedures[0]?.id,
      paymentSplits: [
        {
          paymentMethod: 'CASH_PIX' as const,
          amount: 800.0,
          installments: 1,
        },
      ],
    },
    // Sale 2: Preenchimento - Credit card 3x
    {
      workspaceId: workspace.id,
      patientId: allPatients[1].id,
      saleDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      totalAmount: 1200.0,
      paymentStatus: 'PARTIAL' as const,
      notes: 'Parcelado em 3x no cartão',
      procedureId: procedures.find(p => p.name === 'Preenchimento Labial')?.id || procedures[1]?.id,
      paymentSplits: [
        {
          paymentMethod: 'CREDIT_CARD' as const,
          amount: 1200.0,
          installments: 3,
        },
      ],
    },
    // Sale 3: Package - Split payment (Cash + Credit)
    {
      workspaceId: workspace.id,
      patientId: allPatients[2].id,
      saleDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      totalAmount: 2000.0,
      paymentStatus: 'PARTIAL' as const,
      notes: 'Entrada + parcelamento',
      procedureId: procedures[0]?.id,
      paymentSplits: [
        {
          paymentMethod: 'CASH_PIX' as const,
          amount: 500.0,
          installments: 1,
        },
        {
          paymentMethod: 'CREDIT_CARD' as const,
          amount: 1500.0,
          installments: 5,
        },
      ],
    },
    // Sale 4: Multiple procedures - 6x credit
    {
      workspaceId: workspace.id,
      patientId: allPatients[3].id,
      saleDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
      totalAmount: 1800.0,
      paymentStatus: 'PARTIAL' as const,
      notes: 'Pacote de tratamentos',
      procedureId: procedures[2]?.id,
      paymentSplits: [
        {
          paymentMethod: 'CREDIT_CARD' as const,
          amount: 1800.0,
          installments: 6,
        },
      ],
    },
    // Sale 5: Debit card payment
    {
      workspaceId: workspace.id,
      patientId: allPatients[4].id,
      saleDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      totalAmount: 350.0,
      paymentStatus: 'PAID' as const,
      notes: 'Pagamento no débito',
      procedureId: procedures.find(p => p.name === 'Microagulhamento')?.id || procedures[2]?.id,
      paymentSplits: [
        {
          paymentMethod: 'DEBIT_CARD' as const,
          amount: 350.0,
          installments: 1,
        },
      ],
    },
    // Sale 6: Recent sale - pending payment
    {
      workspaceId: workspace.id,
      patientId: allPatients[5].id,
      saleDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // yesterday
      totalAmount: 600.0,
      paymentStatus: 'PENDING' as const,
      notes: 'Aguardando pagamento',
      procedureId: procedures[0]?.id,
      paymentSplits: [
        {
          paymentMethod: 'CREDIT_CARD' as const,
          amount: 600.0,
          installments: 2,
        },
      ],
    },
    // Sale 7: High-value sale with 12x installments
    {
      workspaceId: workspace.id,
      patientId: allPatients[6].id,
      saleDate: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
      totalAmount: 6000.0,
      paymentStatus: 'PARTIAL' as const,
      notes: 'Tratamento completo - 12x',
      procedureId: procedures[1]?.id,
      paymentSplits: [
        {
          paymentMethod: 'CREDIT_CARD' as const,
          amount: 6000.0,
          installments: 12,
        },
      ],
    },
    // Sale 8: Mixed payment - 3 methods
    {
      workspaceId: workspace.id,
      patientId: allPatients[7].id,
      saleDate: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000), // 12 days ago
      totalAmount: 3500.0,
      paymentStatus: 'PARTIAL' as const,
      notes: 'Pagamento misto',
      procedureId: procedures[3]?.id,
      paymentSplits: [
        {
          paymentMethod: 'CASH_PIX' as const,
          amount: 1000.0,
          installments: 1,
        },
        {
          paymentMethod: 'DEBIT_CARD' as const,
          amount: 500.0,
          installments: 1,
        },
        {
          paymentMethod: 'CREDIT_CARD' as const,
          amount: 2000.0,
          installments: 4,
        },
      ],
    },
  ];

  for (const saleData of salesData) {
    const { paymentSplits, procedureId, ...saleInfo } = saleData;
    
    const sale = await prisma.sale.create({
      data: {
        ...saleInfo,
        items: {
          create: [
            {
              procedureId: procedureId,
              quantity: 1,
              unitPrice: saleInfo.totalAmount,
            },
          ],
        },
      },
    });

    // Create payment splits and installments
    for (const split of paymentSplits) {
      const paymentSplit = await prisma.paymentSplit.create({
        data: {
          saleId: sale.id,
          paymentMethod: split.paymentMethod,
          amount: split.amount,
          installments: split.installments,
        },
      });

      // Create installments
      const installmentAmount = split.amount / split.installments;
      for (let i = 1; i <= split.installments; i++) {
        const dueDate = new Date(saleInfo.saleDate);
        
        // For credit cards, add 30 days per installment
        if (split.paymentMethod === 'CREDIT_CARD') {
          dueDate.setDate(dueDate.getDate() + (30 * i));
        } else {
          // For cash/pix/debit, due date is same day or next day
          dueDate.setDate(dueDate.getDate() + (split.paymentMethod === 'DEBIT_CARD' ? 2 : 0));
        }

        const isPaid = dueDate < now && saleInfo.paymentStatus === 'PAID';
        const isPartiallyPaid = dueDate < now && saleInfo.paymentStatus === 'PARTIAL' && i <= 2;

        await prisma.paymentInstallment.create({
          data: {
            paymentSplitId: paymentSplit.id,
            installmentNumber: i,
            amount: installmentAmount,
            dueDate,
            receivedDate: (isPaid || isPartiallyPaid) ? dueDate : null,
            status: (isPaid || isPartiallyPaid) ? 'PAID' : (dueDate < now ? 'OVERDUE' : 'PENDING'),
            notes: `Parcela ${i}/${split.installments}`,
          },
        });
      }
    }

    // Create procedure sessions
    const sessionDate = new Date(saleInfo.saleDate);
    sessionDate.setDate(sessionDate.getDate() + 2); // Session 2 days after sale

    await prisma.procedureSession.create({
      data: {
        saleId: sale.id,
        procedureId: procedureId,
        scheduledDate: sessionDate,
        completedDate: sessionDate < now ? sessionDate : null,
        status: sessionDate < now ? 'COMPLETED' : 'SCHEDULED',
        appointmentType: 'FIRST_VISIT',
        notes: 'Sessão agendada após venda',
      },
    });
  }

  console.log(`✅ Created ${salesData.length} sales with payment splits`);

  // ========== CREATE SCHEDULED SESSIONS (AGENDA) ==========
  console.log('\n📅 Creating scheduled sessions...');
  const futureSessionsData = [
    // Today's appointments
    {
      patientId: allPatients[8].id,
      procedureId: procedures[0]?.id,
      scheduledDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0),
      appointmentType: 'FIRST_VISIT' as const,
      status: 'SCHEDULED' as const,
      notes: 'Primeira consulta - Avaliação',
    },
    {
      patientId: allPatients[9].id,
      procedureId: procedures[1]?.id,
      scheduledDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 30),
      appointmentType: 'FOLLOW_UP' as const,
      status: 'SCHEDULED' as const,
      notes: 'Retorno - 2ª sessão',
    },
    {
      patientId: allPatients[10].id,
      procedureId: procedures[2]?.id,
      scheduledDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0),
      appointmentType: 'PAYMENT_PENDING' as const,
      status: 'SCHEDULED' as const,
      notes: 'Pendência financeira - acertar pagamento',
    },
    {
      patientId: allPatients[11].id,
      procedureId: procedures[3]?.id,
      scheduledDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 16, 30),
      appointmentType: 'FOLLOW_UP' as const,
      status: 'SCHEDULED' as const,
      notes: 'Retorno - 3ª sessão',
    },
    // Tomorrow's appointments
    {
      patientId: allPatients[12].id,
      procedureId: procedures[0]?.id,
      scheduledDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 10, 0),
      appointmentType: 'FIRST_VISIT' as const,
      status: 'SCHEDULED' as const,
      notes: 'Nova paciente - Instagram',
    },
    {
      patientId: allPatients[13].id,
      procedureId: procedures[4]?.id,
      scheduledDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 14, 30),
      appointmentType: 'FOLLOW_UP' as const,
      status: 'SCHEDULED' as const,
      notes: 'Manutenção mensal',
    },
    // Next week appointments
    {
      patientId: allPatients[14].id,
      procedureId: procedures[1]?.id,
      scheduledDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 9, 30),
      appointmentType: 'FIRST_VISIT' as const,
      status: 'SCHEDULED' as const,
      notes: 'Avaliação completa',
    },
    {
      patientId: allPatients[15].id,
      procedureId: procedures[2]?.id,
      scheduledDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 15, 0),
      appointmentType: 'PAYMENT_PENDING' as const,
      status: 'SCHEDULED' as const,
      notes: 'Confirmar forma de pagamento',
    },
  ];

  // Create sales for future sessions (so they appear in agenda)
  for (const sessionData of futureSessionsData) {
    const sale = await prisma.sale.create({
      data: {
        patientId: sessionData.patientId,
        saleDate: new Date(),
        totalAmount: procedures.find(p => p.id === sessionData.procedureId)?.price || 100,
        paymentStatus: sessionData.appointmentType === 'PAYMENT_PENDING' ? 'PENDING' : 'PAID',
        notes: 'Venda para agendamento',
        workspaceId: workspace.id,
        items: {
          create: [
            {
              procedureId: sessionData.procedureId,
              quantity: 1,
              unitPrice: procedures.find(p => p.id === sessionData.procedureId)?.price || 100,
            },
          ],
        },
      },
    });

    await prisma.procedureSession.create({
      data: {
        saleId: sale.id,
        procedureId: sessionData.procedureId,
        scheduledDate: sessionData.scheduledDate,
        status: sessionData.status,
        appointmentType: sessionData.appointmentType,
        notes: sessionData.notes,
      },
    });
  }

  console.log(`✅ Created ${futureSessionsData.length} scheduled sessions`);

  // ========== CREATE ADDITIONAL COSTS ==========
  console.log('\n💸 Creating additional fixed costs...');
  const additionalFixedCosts = [
    {
      description: 'Contador / Contabilidade',
      costType: 'FIXED' as const,
      category: 'OPERATIONAL' as const,
      fixedValue: 650.0,
      percentage: null,
      paymentDate: new Date('2025-12-05'),
      isRecurring: true,
    },
    {
      description: 'Seguro da Clínica',
      costType: 'FIXED' as const,
      category: 'OPERATIONAL' as const,
      fixedValue: 380.0,
      percentage: null,
      paymentDate: new Date('2025-12-15'),
      isRecurring: true,
    },
    {
      description: 'Manutenção Equipamentos',
      costType: 'FIXED' as const,
      category: 'OPERATIONAL' as const,
      fixedValue: 520.0,
      percentage: null,
      paymentDate: new Date('2025-12-20'),
      isRecurring: true,
    },
    {
      description: 'Marketing e Publicidade',
      costType: 'FIXED' as const,
      category: 'OPERATIONAL' as const,
      fixedValue: 1200.0,
      percentage: null,
      paymentDate: new Date('2025-12-08'),
      isRecurring: true,
    },
    {
      description: 'Material de Escritório',
      costType: 'FIXED' as const,
      category: 'OPERATIONAL' as const,
      fixedValue: 220.0,
      percentage: null,
      paymentDate: new Date('2025-12-12'),
      isRecurring: true,
    },
    {
      description: 'Uniformes e EPIs',
      costType: 'FIXED' as const,
      category: 'OPERATIONAL' as const,
      fixedValue: 340.0,
      percentage: null,
      paymentDate: new Date('2025-12-18'),
      isRecurring: true,
    },
    {
      description: 'Licenças e Alvarás',
      costType: 'FIXED' as const,
      category: 'OPERATIONAL' as const,
      fixedValue: 280.0,
      percentage: null,
      paymentDate: new Date('2025-12-22'),
      isRecurring: true,
    },
    {
      description: 'Condomínio',
      costType: 'FIXED' as const,
      category: 'OPERATIONAL' as const,
      fixedValue: 850.0,
      percentage: null,
      paymentDate: new Date('2025-12-10'),
      isRecurring: true,
    },
  ];

  for (const cost of additionalFixedCosts) {
    const existing = await prisma.cost.findFirst({
      where: {
        workspaceId: workspace.id,
        description: cost.description,
      },
    });

    if (existing) {
      await prisma.cost.update({
        where: { id: existing.id },
        data: cost,
      });
    } else {
      await prisma.cost.create({
        data: { ...cost, workspaceId: workspace.id },
      });
    }
  }

  console.log(`✅ Created ${additionalFixedCosts.length} additional fixed costs`);

  // ========== CREATE TAX COSTS (IMPOSTOS) ==========
  console.log('\n📋 Creating tax costs...');
  const taxCosts = [
    {
      description: 'Simples Nacional',
      costType: 'PERCENTAGE' as const,
      category: 'TAX' as const,
      fixedValue: null,
      percentage: 6.0,
      paymentDate: null,
      isRecurring: false,
    },
    {
      description: 'PIS',
      costType: 'PERCENTAGE' as const,
      category: 'TAX' as const,
      fixedValue: null,
      percentage: 0.65,
      paymentDate: null,
      isRecurring: false,
    },
    {
      description: 'COFINS',
      costType: 'PERCENTAGE' as const,
      category: 'TAX' as const,
      fixedValue: null,
      percentage: 3.0,
      paymentDate: null,
      isRecurring: false,
    },
    {
      description: 'IRPJ',
      costType: 'PERCENTAGE' as const,
      category: 'TAX' as const,
      fixedValue: null,
      percentage: 2.5,
      paymentDate: null,
      isRecurring: false,
    },
    {
      description: 'CSLL',
      costType: 'PERCENTAGE' as const,
      category: 'TAX' as const,
      fixedValue: null,
      percentage: 1.08,
      paymentDate: null,
      isRecurring: false,
    },
  ];

  for (const cost of taxCosts) {
    const existing = await prisma.cost.findFirst({
      where: {
        workspaceId: workspace.id,
        description: cost.description,
      },
    });

    if (existing) {
      await prisma.cost.update({
        where: { id: existing.id },
        data: cost,
      });
    } else {
      await prisma.cost.create({
        data: { ...cost, workspaceId: workspace.id },
      });
    }
  }

  console.log(`✅ Created ${taxCosts.length} tax costs`);

  // ========== CREATE COMMISSION COSTS ==========
  console.log('\n🤝 Creating commission costs...');
  const commissionCosts = [
    {
      description: 'Comissão Equipe Vendas',
      costType: 'PERCENTAGE' as const,
      category: 'COMMISSION' as const,
      fixedValue: null,
      percentage: 5.0,
      paymentDate: null,
      isRecurring: false,
    },
    {
      description: 'Comissão Profissionais',
      costType: 'PERCENTAGE' as const,
      category: 'COMMISSION' as const,
      fixedValue: null,
      percentage: 8.0,
      paymentDate: null,
      isRecurring: false,
    },
    {
      description: 'Comissão Recepção',
      costType: 'PERCENTAGE' as const,
      category: 'COMMISSION' as const,
      fixedValue: null,
      percentage: 2.5,
      paymentDate: null,
      isRecurring: false,
    },
  ];

  for (const cost of commissionCosts) {
    const existing = await prisma.cost.findFirst({
      where: {
        workspaceId: workspace.id,
        description: cost.description,
      },
    });

    if (existing) {
      await prisma.cost.update({
        where: { id: existing.id },
        data: cost,
      });
    } else {
      await prisma.cost.create({
        data: { ...cost, workspaceId: workspace.id },
      });
    }
  }

  console.log(`✅ Created ${commissionCosts.length} commission costs`);

  // ========== SUMMARY ==========
  const totalPatients = await prisma.patient.count({ where: { workspaceId: workspace.id } });
  const totalSales = await prisma.sale.count({ where: { workspaceId: workspace.id } });
  const totalQuotes = await prisma.quote.count({ where: { workspaceId: workspace.id } });
  const totalSessions = await prisma.procedureSession.count({ where: { sale: { workspaceId: workspace.id } } });
  const totalPaymentSplits = await prisma.paymentSplit.count({ where: { sale: { workspaceId: workspace.id } } });
  const totalInstallments = await prisma.paymentInstallment.count({ where: { paymentSplit: { sale: { workspaceId: workspace.id } } } });
  const totalCosts = await prisma.cost.count({ where: { workspaceId: workspace.id } });
  const totalFixedCosts = await prisma.cost.count({ where: { workspaceId: workspace.id, costType: 'FIXED' } });
  const totalTaxCosts = await prisma.cost.count({ where: { workspaceId: workspace.id, category: 'TAX' } });
  const totalCommissionCosts = await prisma.cost.count({ where: { workspaceId: workspace.id, category: 'COMMISSION' } });

  console.log('\n' + '='.repeat(60));
  console.log('✅ MOCK DATA POPULATION COMPLETED!');
  console.log('='.repeat(60));
  console.log(`📊 Workspace: ${workspace.name}`);
  console.log(`👥 Total Patients: ${totalPatients}`);
  console.log(`💰 Total Quotes: ${totalQuotes}`);
  console.log(`💳 Total Sales: ${totalSales}`);
  console.log(`📅 Total Sessions: ${totalSessions}`);
  console.log(`💵 Total Payment Splits: ${totalPaymentSplits}`);
  console.log(`🔢 Total Installments: ${totalInstallments}`);
  console.log(`💸 Total Costs: ${totalCosts}`);
  console.log(`   ├─ Fixed Costs: ${totalFixedCosts}`);
  console.log(`   ├─ Tax Costs: ${totalTaxCosts}`);
  console.log(`   └─ Commission Costs: ${totalCommissionCosts}`);
  console.log('='.repeat(60));
  console.log('\n🎉 All pages should now have comprehensive test data!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
