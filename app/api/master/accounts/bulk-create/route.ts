export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { withMasterAuth } from '@/lib/master-auth';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { seedWorkspaceData } from '@/lib/seed-workspace';

interface AccountInput {
  email: string;
  password: string;
  fullName: string;
  clinicName: string;
  plan?: string;
}

interface AccountResult {
  email: string;
  success: boolean;
  error?: string;
  userId?: string;
  workspaceId?: string;
}

export async function POST(request: NextRequest) {
  // Check master auth
  const authError = await withMasterAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { accounts } = body as { accounts: AccountInput[] };

    if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma conta fornecida. Envie um array de contas.' },
        { status: 400 }
      );
    }

    if (accounts.length > 100) {
      return NextResponse.json(
        { error: 'Máximo de 100 contas por vez.' },
        { status: 400 }
      );
    }

    const validPlans = ['free', 'pro', 'enterprise'];
    const results: AccountResult[] = [];

    for (const account of accounts) {
      const { email, password, fullName, clinicName, plan } = account;

      // Validate required fields
      if (!email || !password || !fullName || !clinicName) {
        results.push({
          email: email || '(vazio)',
          success: false,
          error: 'Campos obrigatórios faltando (email, senha, nome_completo, nome_clinica)',
        });
        continue;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        results.push({
          email,
          success: false,
          error: 'Formato de email inválido',
        });
        continue;
      }

      // Validate password length
      if (password.length < 6) {
        results.push({
          email,
          success: false,
          error: 'Senha deve ter no mínimo 6 caracteres',
        });
        continue;
      }

      // Validate plan
      const selectedPlan = plan && validPlans.includes(plan) ? plan : 'free';

      try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          results.push({
            email,
            success: false,
            error: 'Email já cadastrado',
          });
          continue;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user and workspace in transaction
        const result = await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              email,
              password: hashedPassword,
              fullName,
              name: fullName,
              role: 'ADMIN',
            },
          });

          const workspace = await tx.workspace.create({
            data: {
              name: clinicName,
              ownerId: user.id,
              plan: selectedPlan,
            },
          });

          // Link user to workspace
          await tx.user.update({
            where: { id: user.id },
            data: { workspaceId: workspace.id },
          });

          return { user, workspace };
        });

        // Seed workspace data (non-critical)
        try {
          await seedWorkspaceData(result.workspace.id);
        } catch (seedError) {
          console.error(`Error seeding workspace ${result.workspace.id}:`, seedError);
        }

        results.push({
          email,
          success: true,
          userId: result.user.id,
          workspaceId: result.workspace.id,
        });
      } catch (error: any) {
        console.error(`Error creating account for ${email}:`, error);
        results.push({
          email,
          success: false,
          error: error.message || 'Erro interno ao criar conta',
        });
      }
    }

    const created = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({
      message: `${created} conta(s) criada(s), ${failed} erro(s)`,
      created,
      failed,
      total: results.length,
      results,
    });
  } catch (error) {
    console.error('Bulk create error:', error);
    return NextResponse.json(
      { error: 'Erro ao processar criação em massa' },
      { status: 500 }
    );
  }
}
