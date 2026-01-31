import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST /api/agenda/criar - Create new appointment directly from calendar
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspace = await getUserWorkspace((session.user as any).id);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      patientId,
      procedureId,
      collaboratorId,
      scheduledDate,
      appointmentType,
      notes,
      // Optional: create sale if needed
      createSale,
      saleAmount,
    } = body;

    // Validate required fields
    if (!patientId || !procedureId || !scheduledDate) {
      return NextResponse.json(
        { error: 'Paciente, procedimento e data são obrigatórios' },
        { status: 400 }
      );
    }

    // Verify patient belongs to workspace
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, workspaceId: workspace.id },
    });
    if (!patient) {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 });
    }

    // Verify procedure belongs to workspace
    const procedure = await prisma.procedure.findFirst({
      where: { id: procedureId, workspaceId: workspace.id },
    });
    if (!procedure) {
      return NextResponse.json({ error: 'Procedimento não encontrado' }, { status: 404 });
    }

    // Check if we need to create a new sale or use an existing pending session
    let saleId: string;

    // First, try to find an existing pending session for this patient/procedure
    const existingSession = await prisma.procedureSession.findFirst({
      where: {
        procedureId,
        status: 'PENDING',
        scheduledDate: null, // Not yet scheduled
        sale: {
          patientId,
          workspaceId: workspace.id,
        },
      },
      include: {
        sale: true,
      },
    });

    if (existingSession) {
      // Update the existing session with the scheduled date
      const updatedSession = await prisma.procedureSession.update({
        where: { id: existingSession.id },
        data: {
          scheduledDate: new Date(scheduledDate),
          status: 'SCHEDULED',
          collaboratorId: collaboratorId || null,
          appointmentType: appointmentType || null,
          notes: notes || null,
        },
        include: {
          sale: {
            include: {
              patient: true,
            },
          },
          procedure: true,
        },
      });

      return NextResponse.json({
        success: true,
        session: updatedSession,
        message: 'Sessão existente agendada com sucesso',
      }, { status: 200 });
    }

    // If createSale is true or no existing session, create a new sale with the appointment
    if (createSale) {
      const sale = await prisma.sale.create({
        data: {
          workspaceId: workspace.id,
          patientId,
          totalAmount: saleAmount || procedure.price,
          paymentStatus: 'PENDING',
          notes: `Agendamento criado via calendário - ${procedure.name}`,
          items: {
            create: {
              procedureId,
              quantity: 1,
              unitPrice: procedure.price,
            },
          },
        },
      });

      saleId = sale.id;
    } else {
      // Find most recent pending sale for this patient or create minimal sale
      const existingSale = await prisma.sale.findFirst({
        where: {
          workspaceId: workspace.id,
          patientId,
          paymentStatus: 'PENDING',
        },
        orderBy: { createdAt: 'desc' },
      });

      if (existingSale) {
        saleId = existingSale.id;
        
        // Check if this procedure is already in the sale items
        const existingItem = await prisma.saleItem.findFirst({
          where: {
            saleId: existingSale.id,
            procedureId,
          },
        });

        if (!existingItem) {
          // Add the procedure to the sale
          await prisma.saleItem.create({
            data: {
              saleId: existingSale.id,
              procedureId,
              quantity: 1,
              unitPrice: procedure.price,
            },
          });

          // Update sale total
          await prisma.sale.update({
            where: { id: existingSale.id },
            data: {
              totalAmount: { increment: procedure.price },
            },
          });
        }
      } else {
        // Create a minimal sale
        const sale = await prisma.sale.create({
          data: {
            workspaceId: workspace.id,
            patientId,
            totalAmount: procedure.price,
            paymentStatus: 'PENDING',
            notes: `Agendamento criado via calendário - ${procedure.name}`,
            items: {
              create: {
                procedureId,
                quantity: 1,
                unitPrice: procedure.price,
              },
            },
          },
        });
        saleId = sale.id;
      }
    }

    // Create the procedure session (appointment)
    const newSession = await prisma.procedureSession.create({
      data: {
        saleId,
        procedureId,
        collaboratorId: collaboratorId || null,
        scheduledDate: new Date(scheduledDate),
        status: 'SCHEDULED',
        appointmentType: appointmentType || null,
        notes: notes || null,
      },
      include: {
        sale: {
          include: {
            patient: true,
          },
        },
        procedure: true,
      },
    });

    return NextResponse.json({
      success: true,
      session: newSession,
      message: 'Agendamento criado com sucesso',
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating appointment:', error);
    return NextResponse.json(
      { error: 'Erro ao criar agendamento' },
      { status: 500 }
    );
  }
}
