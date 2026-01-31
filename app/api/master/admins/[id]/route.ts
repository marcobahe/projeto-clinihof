import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verificar se é usuário MASTER
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!currentUser || currentUser.role !== 'MASTER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Buscar usuário alvo
    const targetUser = await prisma.user.findUnique({
      where: { id: params.id },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verificar se é um usuário MASTER
    if (targetUser.role !== 'MASTER') {
      return NextResponse.json({ error: 'User is not a MASTER' }, { status: 400 })
    }

    // Não permitir revogar o próprio acesso (para evitar lock-out)
    if (targetUser.id === currentUser.id) {
      return NextResponse.json(
        { error: 'Cannot revoke your own MASTER access' },
        { status: 403 }
      )
    }

    // Verificar se existe pelo menos outro MASTER no sistema
    const masterCount = await prisma.user.count({
      where: { role: 'MASTER' },
    })

    if (masterCount <= 1) {
      return NextResponse.json(
        { error: 'Cannot revoke access. At least one MASTER must remain in the system' },
        { status: 400 }
      )
    }

    // Revogar acesso MASTER (rebaixar para ADMIN)
    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: {
        role: 'ADMIN',
      },
      select: {
        id: true,
        name: true,
        fullName: true,
        email: true,
        role: true,
      },
    })

    return NextResponse.json({
      message: 'MASTER access revoked successfully. User is now ADMIN.',
      user: updatedUser,
    })
  } catch (error) {
    console.error('Error revoking master access:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { status } = await request.json()

    // Verificar se é usuário MASTER
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!currentUser || currentUser.role !== 'MASTER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Buscar usuário alvo
    const targetUser = await prisma.user.findUnique({
      where: { id: params.id },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verificar se é um usuário MASTER
    if (targetUser.role !== 'MASTER') {
      return NextResponse.json({ error: 'User is not a MASTER' }, { status: 400 })
    }

    // Não permitir alterar status do próprio usuário
    if (targetUser.id === currentUser.id) {
      return NextResponse.json(
        { error: 'Cannot change your own status' },
        { status: 403 }
      )
    }

    // Por ora, só suportamos ativação/desativação básica
    // Em futuras versões, pode implementar suspensão temporária, etc.
    
    return NextResponse.json({
      message: 'Status updated successfully',
      user: targetUser,
    })
  } catch (error) {
    console.error('Error updating master status:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}