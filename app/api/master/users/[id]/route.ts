import { NextRequest, NextResponse } from 'next/server'
import { getMasterSession, withMasterAuth } from '@/lib/master-auth'
import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'

interface RouteParams {
  params: {
    id: string
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  // Check if user has master auth
  const authError = await withMasterAuth(request)
  if (authError) return authError

  try {
    const { id } = params
    const body = await request.json()
    
    const { role } = body

    // Validate input
    if (!role || !Object.values(UserRole).includes(role)) {
      return NextResponse.json(
        { error: 'Valid role is required' },
        { status: 400 }
      )
    }

    // Prevent updating master user to non-master role (safety check)
    const currentUser = await prisma.user.findUnique({
      where: { id }
    })

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get current master session to prevent self-demotion
    const session = await getMasterSession()
    if (currentUser.id === session.user.id && role !== UserRole.MASTER) {
      return NextResponse.json(
        { error: 'Cannot remove MASTER role from yourself' },
        { status: 400 }
      )
    }

    // Update user
    const user = await prisma.user.update({
      where: { id },
      data: { role },
      include: {
        workspaces: {
          select: {
            id: true,
            name: true,
            status: true,
            plan: true
          }
        }
      }
    })

    return NextResponse.json({
      id: user.id,
      name: user.name,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      workspaces: user.workspaces
    })
  } catch (error) {
    console.error('Error updating user:', error)
    
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  // Check if user has master auth
  const authError = await withMasterAuth(request)
  if (authError) return authError

  try {
    const { id } = params

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        workspaces: {
          include: {
            _count: {
              select: {
                sales: true,
                patients: true,
                collaborators: true
              }
            }
          }
        },
        sessions: {
          orderBy: {
            expires: 'desc'
          },
          take: 5
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      workspaces: user.workspaces,
      recentSessions: user.sessions
    })
  } catch (error) {
    console.error('Error fetching user details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user details' },
      { status: 500 }
    )
  }
}