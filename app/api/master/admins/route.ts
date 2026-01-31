import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { hash } from 'bcryptjs'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verificar se é usuário MASTER
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user || user.role !== 'MASTER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Buscar todos os usuários MASTER
    const masters = await prisma.user.findMany({
      where: {
        role: 'MASTER',
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

    return NextResponse.json({ masters })
  } catch (error) {
    console.error('Error fetching master admins:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { email, name, isNewUser } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Verificar se é usuário MASTER
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!currentUser || currentUser.role !== 'MASTER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (isNewUser) {
      // Criar novo usuário MASTER
      if (!name) {
        return NextResponse.json({ error: 'Name is required for new user' }, { status: 400 })
      }

      // Verificar se email já existe
      const existingUser = await prisma.user.findUnique({
        where: { email },
      })

      if (existingUser) {
        return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 })
      }

      // Criar usuário com senha temporária
      const temporaryPassword = 'Master@123'
      const hashedPassword = await hash(temporaryPassword, 12)

      const newUser = await prisma.user.create({
        data: {
          email,
          name,
          fullName: name,
          password: hashedPassword,
          role: 'MASTER',
        },
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
        message: 'Master user created successfully',
        user: newUser,
      })
    } else {
      // Promover usuário existente para MASTER
      const existingUser = await prisma.user.findUnique({
        where: { email },
      })

      if (!existingUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      if (existingUser.role === 'MASTER') {
        return NextResponse.json({ error: 'User is already a MASTER' }, { status: 400 })
      }

      // Promover para MASTER
      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          role: 'MASTER',
          workspaceId: null, // MASTER não pertence a um workspace específico
        },
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
        message: 'User promoted to MASTER successfully',
        user: updatedUser,
      })
    }
  } catch (error) {
    console.error('Error creating/promoting master admin:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}