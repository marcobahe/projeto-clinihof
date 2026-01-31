import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { hash } from 'bcryptjs'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { canManageTeam } from '@/lib/permissions'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Buscar usuário logado com seu workspace
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        workspace: true,
        ownedWorkspaces: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Determinar qual workspace usar (próprio ou que é membro)
    const currentWorkspace = user.ownedWorkspaces[0] || user.workspace
    
    if (!currentWorkspace) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }

    // Verificar se tem permissão para ver a equipe
    if (!canManageTeam(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Buscar todos os membros do workspace
    const members = await prisma.user.findMany({
      where: {
        OR: [
          { workspaceId: currentWorkspace.id }, // Membros do workspace
          { id: currentWorkspace.ownerId },     // Owner do workspace
        ],
      },
      select: {
        id: true,
        name: true,
        fullName: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    return NextResponse.json({ members })
  } catch (error) {
    console.error('Error fetching team members:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { email, name, role } = await request.json()

    if (!email || !name || !role) {
      return NextResponse.json(
        { error: 'Email, name, and role are required' },
        { status: 400 }
      )
    }

    // Validar roles permitidos
    const allowedRoles = ['ADMIN', 'MANAGER', 'RECEPTIONIST', 'USER']
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Buscar usuário logado com seu workspace
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        workspace: true,
        ownedWorkspaces: true,
      },
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Determinar qual workspace usar
    const currentWorkspace = currentUser.ownedWorkspaces[0] || currentUser.workspace
    
    if (!currentWorkspace) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }

    // Verificar se tem permissão para convidar com este role
    if (!canManageTeam(currentUser.role, role)) {
      return NextResponse.json({ error: 'Forbidden to invite this role' }, { status: 403 })
    }

    // Verificar limite de usuários do workspace
    const currentMemberCount = await prisma.user.count({
      where: {
        OR: [
          { workspaceId: currentWorkspace.id },
          { id: currentWorkspace.ownerId },
        ],
      },
    })

    if (currentMemberCount >= currentWorkspace.maxUsers) {
      return NextResponse.json(
        { error: 'Maximum number of users reached for this workspace' },
        { status: 400 }
      )
    }

    // Verificar se usuário já existe
    let existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      // Se usuário já existe, verificar se já está no workspace
      if (existingUser.workspaceId === currentWorkspace.id || existingUser.id === currentWorkspace.ownerId) {
        return NextResponse.json(
          { error: 'User already in this workspace' },
          { status: 400 }
        )
      }

      // Se usuário já tem outro workspace, não pode ser adicionado
      if (existingUser.workspaceId) {
        return NextResponse.json(
          { error: 'User already belongs to another workspace' },
          { status: 400 }
        )
      }

      // Atualizar usuário existente para vincular ao workspace
      existingUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          workspaceId: currentWorkspace.id,
          role: role,
          fullName: name,
        },
      })
    } else {
      // Criar novo usuário com senha temporária
      const temporaryPassword = 'Trocar@123'
      const hashedPassword = await hash(temporaryPassword, 12)

      existingUser = await prisma.user.create({
        data: {
          email,
          name,
          fullName: name,
          password: hashedPassword,
          role: role,
          workspaceId: currentWorkspace.id,
        },
      })
    }

    return NextResponse.json({
      message: 'User invited successfully',
      user: {
        id: existingUser.id,
        name: existingUser.name,
        fullName: existingUser.fullName,
        email: existingUser.email,
        role: existingUser.role,
        createdAt: existingUser.createdAt,
      },
    })
  } catch (error) {
    console.error('Error inviting user:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}