import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getEffectiveWorkspace } from '@/lib/get-workspace-id';
import { PatientOrigin } from '@prisma/client';

export const dynamic = 'force-dynamic';

const VALID_ORIGINS: PatientOrigin[] = [
  'INSTAGRAM',
  'INDICACAO',
  'GOOGLE',
  'WHATSAPP',
  'FACEBOOK',
  'SITE',
  'OUTROS',
];

interface PatientImportData {
  name: string;
  phone: string;
  email?: string | null;
  birthday?: string | null;
  origin?: string | null;
  notes?: string | null;
}

interface ImportError {
  row: number;
  name: string;
  phone: string;
  error: string;
}

interface ImportResult {
  success: number;
  failed: number;
  duplicates: number;
  errors: ImportError[];
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const workspace = await getEffectiveWorkspace();

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
    }

    const body = await req.json();
    const { patients } = body as { patients: PatientImportData[] };

    if (!patients || !Array.isArray(patients) || patients.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum paciente para importar' },
        { status: 400 }
      );
    }

    // Limita a 500 pacientes por importação para evitar timeout
    if (patients.length > 500) {
      return NextResponse.json(
        { error: 'Máximo de 500 pacientes por importação' },
        { status: 400 }
      );
    }

    const result: ImportResult = {
      success: 0,
      failed: 0,
      duplicates: 0,
      errors: [],
    };

    // Processa cada paciente
    for (let i = 0; i < patients.length; i++) {
      const patient = patients[i];
      const rowNumber = i + 2; // +2 para compensar índice zero e linha de cabeçalho

      try {
        // Validação básica
        if (!patient.name || !patient.phone) {
          result.failed++;
          result.errors.push({
            row: rowNumber,
            name: patient.name || '',
            phone: patient.phone || '',
            error: 'Nome e telefone são obrigatórios',
          });
          continue;
        }

        const name = patient.name.trim();
        const phone = patient.phone.trim();

        // Verifica se já existe (duplicata)
        const existingPatient = await prisma.patient.findUnique({
          where: {
            workspaceId_name_phone: {
              workspaceId: workspace.id,
              name,
              phone,
            },
          },
        });

        if (existingPatient) {
          result.duplicates++;
          result.errors.push({
            row: rowNumber,
            name,
            phone,
            error: 'Paciente já existe (mesmo nome e telefone)',
          });
          continue;
        }

        // Prepara os dados
        let birthday: Date | null = null;
        if (patient.birthday) {
          const parsedDate = new Date(patient.birthday);
          if (!isNaN(parsedDate.getTime())) {
            birthday = parsedDate;
          }
        }

        let origin: PatientOrigin | null = null;
        if (patient.origin) {
          const upperOrigin = patient.origin.toUpperCase() as PatientOrigin;
          if (VALID_ORIGINS.includes(upperOrigin)) {
            origin = upperOrigin;
          }
        }

        // Cria o paciente
        await prisma.patient.create({
          data: {
            workspaceId: workspace.id,
            name,
            phone,
            email: patient.email?.trim() || null,
            birthday,
            origin,
            notes: patient.notes?.trim() || null,
          },
        });

        result.success++;
      } catch (error) {
        result.failed++;
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        result.errors.push({
          row: rowNumber,
          name: patient.name || '',
          phone: patient.phone || '',
          error: errorMessage,
        });
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Import patients error:', error);
    return NextResponse.json(
      { error: 'Erro ao importar pacientes' },
      { status: 500 }
    );
  }
}
