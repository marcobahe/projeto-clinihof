export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { seedWorkspaceData } from '@/lib/seed-workspace';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, fullName, clinicName } = body;

    // Validate required fields
    if (!email || !password || !fullName || !clinicName) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Este e-mail já está cadastrado' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user and workspace
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
        },
      });

      // Update user to link to workspace
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: { workspaceId: workspace.id },
      });

      return { user: updatedUser, workspace };
    });

    // Create example data for the new workspace (outside transaction for better performance)
    try {
      await seedWorkspaceData(result.workspace.id);
      console.log(`Example data created for workspace: ${result.workspace.id}`);
    } catch (exampleDataError) {
      // Log error but don't fail signup if example data creation fails
      console.error('Error creating example data:', exampleDataError);
    }

    return NextResponse.json(
      {
        message: 'Conta criada com sucesso!',
        user: {
          id: result.user.id,
          email: result.user.email,
          fullName: result.user.fullName,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Erro ao criar conta' },
      { status: 500 }
    );
  }
}
