export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { canManageTeam } from '@/lib/permissions'
import bcrypt from 'bcryptjs'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, role } = await request.json()

    // Handle password reset action
    if (action === 'reset-password') {
      // Buscar usuário alvo
      const targetUser = await prisma.user.findUnique({
        where: { id: params.id },
      })

      if (!targetUser) {
        return NextResponse.json({ error: 'Target user not found' }, { status: 404 })
      }

      // Buscar usuário logado
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

      // Determinar workspace atual
      const currentWorkspace = currentUser.ownedWorkspaces[0] || currentUser.workspace
      
      if (!currentWorkspace) {
        return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
      }

      // Verificar se o usuário alvo pertence ao mesmo workspace
      const isInSameWorkspace = 
        targetUser.workspaceId === currentWorkspace.id ||
        targetUser.id === currentWorkspace.ownerId

      if (!isInSameWorkspace) {
        return NextResponse.json(
          { error: 'User does not belong to your workspace' },
          { status: 403 }
        )
      }

      // Verificar se tem permissão para resetar senha
      if (!canManageTeam(currentUser.role, targetUser.role)) {
        return NextResponse.json({ error: 'Forbidden to reset password for this user' }, { status: 403 })
      }

      // Generate temporary password (Reset + 4 random digits)
      const randomDigits = Math.floor(1000 + Math.random() * 9000).toString()
      const tempPassword = `Reset${randomDigits}`
      
      // Hash the temporary password
      const hashedPassword = await bcrypt.hash(tempPassword, 10)
      
      // Update user password
      await prisma.user.update({
        where: { id: params.id },
        data: { password: hashedPassword },
      })

      return NextResponse.json({
        message: 'Senha resetada com sucesso',
        tempPassword: tempPassword
      })
    }

    if (!role) {
      return NextResponse.json({ error: 'Role is required' }, { status: 400 })
    }

    // Validar roles permitidos
    const allowedRoles = ['ADMIN', 'MANAGER', 'RECEPTIONIST', 'USER']
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Buscar usuário logado
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

    // Verificar se tem permissão para alterar roles
    if (!canManageTeam(currentUser.role, role)) {
      return NextResponse.json({ error: 'Forbidden to set this role' }, { status: 403 })
    }

    // Buscar usuário alvo
    const targetUser = await prisma.user.findUnique({
      where: { id: params.id },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 })
    }

    // Determinar workspace atual
    const currentWorkspace = currentUser.ownedWorkspaces[0] || currentUser.workspace
    
    if (!currentWorkspace) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }

    // Verificar se o usuário alvo pertence ao mesmo workspace
    const isInSameWorkspace = 
      targetUser.workspaceId === currentWorkspace.id ||
      targetUser.id === currentWorkspace.ownerId

    if (!isInSameWorkspace) {
      return NextResponse.json(
        { error: 'User does not belong to your workspace' },
        { status: 403 }
      )
    }

    // Não permitir alterar role do owner do workspace
    if (targetUser.id === currentWorkspace.ownerId) {
      return NextResponse.json(
        { error: 'Cannot change role of workspace owner' },
        { status: 403 }
      )
    }

    // Atualizar role do usuário
    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: { role },
      select: {
        id: true,
        name: true,
        fullName: true,
        email: true,
        role: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      message: 'User role updated successfully',
      user: updatedUser,
    })
  } catch (error) {
    console.error('Error updating user role:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Buscar usuário logado
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

    // Verificar se tem permissão para remover membros
    if (!canManageTeam(currentUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Buscar usuário alvo
    const targetUser = await prisma.user.findUnique({
      where: { id: params.id },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 })
    }

    // Determinar workspace atual
    const currentWorkspace = currentUser.ownedWorkspaces[0] || currentUser.workspace
    
    if (!currentWorkspace) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }

    // Verificar se o usuário alvo pertence ao mesmo workspace
    const isInSameWorkspace = 
      targetUser.workspaceId === currentWorkspace.id ||
      targetUser.id === currentWorkspace.ownerId

    if (!isInSameWorkspace) {
      return NextResponse.json(
        { error: 'User does not belong to your workspace' },
        { status: 403 }
      )
    }

    // Não permitir remover o owner do workspace
    if (targetUser.id === currentWorkspace.ownerId) {
      return NextResponse.json(
        { error: 'Cannot remove workspace owner' },
        { status: 403 }
      )
    }

    // Não permitir remover a si mesmo (para evitar lock-out)
    if (targetUser.id === currentUser.id) {
      return NextResponse.json(
        { error: 'Cannot remove yourself' },
        { status: 403 }
      )
    }

    // Remover usuário do workspace (não deletar o usuário, apenas desvincular)
    await prisma.user.update({
      where: { id: params.id },
      data: {
        workspaceId: null,
        role: 'USER', // Reset para role padrão
      },
    })

    return NextResponse.json({
      message: 'User removed from workspace successfully',
    })
  } catch (error) {
    console.error('Error removing user from workspace:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}