import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getUserWorkspace } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

/**
 * GET /api/quotes
 * Returns all quotes for the workspace
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    if (!userId) {
      return NextResponse.json({ error: 'ID do usuário não encontrado' }, { status: 400 });
    }

    const workspace = await getUserWorkspace(userId);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status'); // PENDING, SENT, ACCEPTED, REJECTED, EXPIRED

    const whereClause: any = {
      workspaceId: workspace.id
    };

    if (status) {
      whereClause.status = status;
    }

    const quotes = await prisma.quote.findMany({
      where: whereClause,
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true
          }
        },
        collaborator: {
          select: {
            id: true,
            name: true
          }
        },
        items: {
          include: {
            procedure: {
              select: {
                id: true,
                name: true,
                price: true
              }
            }
          }
        }
      },
      orderBy: {
        createdDate: 'desc'
      }
    });

    return NextResponse.json({ quotes });
  } catch (error) {
    console.error('Error fetching quotes:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar orçamentos' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/quotes
 * Create a new quote
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    if (!userId) {
      return NextResponse.json({ error: 'ID do usuário não encontrado' }, { status: 400 });
    }

    const workspace = await getUserWorkspace(userId);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
    }

    const body = await req.json();
    const { 
      patientId,
      collaboratorId,
      title,
      items,
      discountPercent = 0,
      discountAmount = 0,
      notes,
      leadSource,
      expirationDate
    } = body;

    // Validation
    if (!patientId || !title || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: patientId, title, items (deve conter ao menos 1 item)' },
        { status: 400 }
      );
    }

    // Verify patient belongs to workspace
    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        workspaceId: workspace.id
      }
    });

    if (!patient) {
      return NextResponse.json(
        { error: 'Paciente não encontrado' },
        { status: 404 }
      );
    }

    // Calculate totals
    let totalAmount = 0;
    const itemsToCreate = [];

    for (const item of items) {
      const { procedureId, description, quantity, unitPrice } = item;
      
      if (!description || !quantity || !unitPrice) {
        return NextResponse.json(
          { error: 'Cada item deve ter: description, quantity, unitPrice' },
          { status: 400 }
        );
      }

      const totalPrice = quantity * unitPrice;
      totalAmount += totalPrice;

      itemsToCreate.push({
        procedureId: procedureId || null,
        description,
        quantity,
        unitPrice,
        totalPrice
      });
    }

    // Calculate final amount with discount
    let finalAmount = totalAmount;
    let finalDiscountAmount = discountAmount;
    let finalDiscountPercent = discountPercent;

    if (discountPercent > 0) {
      finalDiscountAmount = (totalAmount * discountPercent) / 100;
      finalAmount = totalAmount - finalDiscountAmount;
    } else if (discountAmount > 0) {
      finalAmount = totalAmount - discountAmount;
      finalDiscountPercent = (discountAmount / totalAmount) * 100;
    }

    // Create quote with items
    const quote = await prisma.quote.create({
      data: {
        workspaceId: workspace.id,
        patientId,
        collaboratorId: collaboratorId || null,
        title,
        totalAmount,
        discountPercent: finalDiscountPercent,
        discountAmount: finalDiscountAmount,
        finalAmount,
        notes,
        leadSource,
        expirationDate: expirationDate ? new Date(expirationDate) : null,
        status: 'PENDING',
        items: {
          create: itemsToCreate
        }
      },
      include: {
        patient: true,
        collaborator: true,
        items: {
          include: {
            procedure: true
          }
        }
      }
    });

    return NextResponse.json(quote, { status: 201 });
  } catch (error) {
    console.error('Error creating quote:', error);
    return NextResponse.json(
      { error: 'Erro ao criar orçamento' },
      { status: 500 }
    );
  }
}
