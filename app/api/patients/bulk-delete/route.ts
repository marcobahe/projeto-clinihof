import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getEffectiveWorkspace } from '@/lib/get-workspace-id';
import { canWrite } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

const MAX_BULK_DELETE = 500;

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (!canWrite((session.user as any).role, 'patients')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const workspace = await getEffectiveWorkspace();

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
    }

    const body = await req.json();
    const ids: string[] = Array.isArray(body?.ids)
      ? Array.from(
          new Set(
            body.ids
              .filter((id: unknown): id is string => typeof id === 'string' && Boolean(id.trim()))
              .map((id: string) => id.trim())
          )
        )
      : [];

    if (ids.length === 0) {
      return NextResponse.json({ error: 'Selecione ao menos um paciente' }, { status: 400 });
    }

    if (ids.length > MAX_BULK_DELETE) {
      return NextResponse.json(
        { error: `Selecione no máximo ${MAX_BULK_DELETE} pacientes por exclusão` },
        { status: 400 }
      );
    }

    if (body?.confirmText !== 'EXCLUIR') {
      return NextResponse.json(
        { error: 'Confirmação inválida. Digite EXCLUIR para confirmar.' },
        { status: 400 }
      );
    }

    const where = {
      id: { in: ids },
      workspaceId: workspace.id,
    };

    const [patientsCount, salesCount, quotesCount, prescriptionsCount, formulasCount, mealPlansCount] = await Promise.all([
      prisma.patient.count({ where }),
      prisma.sale.count({ where: { patientId: { in: ids }, workspaceId: workspace.id } }),
      prisma.quote.count({ where: { patientId: { in: ids }, workspaceId: workspace.id } }),
      prisma.prescription.count({ where: { patientId: { in: ids }, workspaceId: workspace.id } }),
      prisma.formula.count({ where: { patientId: { in: ids }, workspaceId: workspace.id } }),
      prisma.mealPlan.count({ where: { patientId: { in: ids }, workspaceId: workspace.id } }),
    ]);

    if (patientsCount !== ids.length) {
      return NextResponse.json(
        { error: 'Um ou mais pacientes não pertencem ao seu workspace' },
        { status: 403 }
      );
    }

    const result = await prisma.patient.deleteMany({ where });

    return NextResponse.json({
      deleted: result.count,
      requested: ids.length,
      relatedRecords: {
        sales: salesCount,
        quotes: quotesCount,
        prescriptions: prescriptionsCount,
        formulas: formulasCount,
        mealPlans: mealPlansCount,
      },
    });
  } catch (error) {
    console.error('Bulk delete patients error:', error);
    return NextResponse.json({ error: 'Erro ao excluir pacientes' }, { status: 500 });
  }
}
