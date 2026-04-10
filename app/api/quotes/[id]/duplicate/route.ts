import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getUserWorkspace } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

/**
 * POST /api/quotes/[id]/duplicate
 * Duplicar orçamento (clonar para mesmo ou outro paciente)
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;
    const body = await req.json().catch(() => ({}));
    const { patientId } = body; // Opcional: trocar paciente na duplicata

    // Buscar orçamento original
    const originalQuote = await prisma.quote.findFirst({
      where: { id, workspaceId: workspace.id },
      include: {
        items: {
          include: {
            procedure: true,
            package: { include: { items: { include: { procedure: true } } } }
          }
        }
      }
    });

    if (!originalQuote) {
      return NextResponse.json({ error: 'Orçamento não encontrado' }, { status: 404 });
    }

    // Criar duplicata
    const duplicatedQuote = await prisma.quote.create({
      data: {
        workspaceId: workspace.id,
        patientId: patientId || originalQuote.patientId,
        collaboratorId: originalQuote.collaboratorId,
        title: `${originalQuote.title} (cópia)`,
        totalAmount: originalQuote.totalAmount,
        discountPercent: originalQuote.discountPercent,
        discountAmount: originalQuote.discountAmount,
        finalAmount: originalQuote.finalAmount,
        status: 'PENDING',
        notes: originalQuote.notes,
        leadSource: originalQuote.leadSource,
        items: {
          create: originalQuote.items.map(item => ({
            procedureId: item.procedureId,
            packageId: item.packageId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            originalPrice: item.originalPrice,
            savingsAmount: item.savingsAmount,
            savingsPercent: item.savingsPercent,
          }))
        }
      },
      include: {
        patient: true,
        items: {
          include: {
            procedure: true,
            package: true
          }
        }
      }
    });

    return NextResponse.json(duplicatedQuote, { status: 201 });
  } catch (error) {
    console.error('Error duplicating quote:', error);
    return NextResponse.json({ error: 'Erro ao duplicar orçamento' }, { status: 500 });
  }
}
