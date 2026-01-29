/** @jsxImportSource react */
import React from 'react';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getUserWorkspace } from '@/lib/workspace';
import { renderToStream } from '@react-pdf/renderer';
import { QuoteTemplate } from '@/components/pdf/quote-template';
import { Readable } from 'stream';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const workspace = await getUserWorkspace((session.user as any).id);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
    }

    // Buscar o orçamento com todas as relações
    const quote = await prisma.quote.findFirst({
      where: {
        id: params.id,
        workspaceId: workspace.id,
      },
      include: {
        patient: true,
        collaborator: true,
        items: {
          include: {
            procedure: true,
          },
        },
      },
    });

    if (!quote) {
      return NextResponse.json({ error: 'Orçamento não encontrado' }, { status: 404 });
    }

    // Preparar dados para o PDF
    const pdfData = {
      clinicName: workspace.name,
      professionalName: quote.collaborator?.name || 'Não especificado',
      patientName: quote.patient.name,
      patientPhone: quote.patient.phone || undefined,
      patientEmail: quote.patient.email || undefined,
      quoteNumber: quote.id.substring(0, 8).toUpperCase(),
      createdDate: quote.createdDate.toISOString(),
      expirationDate: quote.expirationDate?.toISOString(),
      items: quote.items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })),
      totalAmount: quote.totalAmount,
      discountPercent: quote.discountPercent,
      discountAmount: quote.discountAmount,
      finalAmount: quote.finalAmount,
      notes: quote.notes || undefined,
      leadSource: quote.leadSource || undefined,
    };

    // Gerar o PDF
    const stream = await renderToStream(React.createElement(QuoteTemplate, { data: pdfData }) as any);

    // Converter stream para buffer
    const chunks: Buffer[] = [];
    for await (const chunk of stream as unknown as Readable) {
      chunks.push(Buffer.from(chunk));
    }
    const pdfBuffer = Buffer.concat(chunks);

    // Retornar o PDF
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="orcamento-${quote.id.substring(0, 8)}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar PDF' },
      { status: 500 }
    );
  }
}
