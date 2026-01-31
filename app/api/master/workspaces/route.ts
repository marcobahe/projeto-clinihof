import { NextRequest, NextResponse } from 'next/server'
import { getMasterSession, withMasterAuth } from '@/lib/master-auth'
import { prisma } from '@/lib/prisma'
import { WorkspaceStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  // Check if user has master auth
  const authError = await withMasterAuth(request)
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit
    
    const statusFilter = searchParams.get('status') as WorkspaceStatus | null
    const search = searchParams.get('search') || ''

    // Build where clause
    const where: any = {}
    
    if (statusFilter) {
      where.status = statusFilter
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { owner: { name: { contains: search, mode: 'insensitive' } } },
        { owner: { email: { contains: search, mode: 'insensitive' } } }
      ]
    }

    // Get workspaces with owner info and user count
    const [workspaces, total] = await Promise.all([
      prisma.workspace.findMany({
        where,
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          _count: {
            select: {
              sales: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      
      prisma.workspace.count({ where })
    ])

    // Get user count for each workspace (since User doesn't have workspaceId)
    // We'll need to find users whose workspaces they own
    const workspacesWithUserCount = await Promise.all(
      workspaces.map(async (workspace) => {
        // Count users who own this workspace (owner) + any collaborators
        // For now, let's just count the owner as 1 user per workspace
        const userCount = 1 // Owner
        
        return {
          ...workspace,
          userCount
        }
      })
    )

    return NextResponse.json({
      workspaces: workspacesWithUserCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching workspaces:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workspaces' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  // Check if user has master auth
  const authError = await withMasterAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { name, ownerEmail, plan = 'free', maxUsers = 5 } = body

    if (!name || !ownerEmail) {
      return NextResponse.json(
        { error: 'Name and owner email are required' },
        { status: 400 }
      )
    }

    // Check if user exists
    let owner = await prisma.user.findUnique({
      where: { email: ownerEmail }
    })

    // If user doesn't exist, we need to create them
    if (!owner) {
      return NextResponse.json(
        { error: 'User with this email does not exist. Create the user first.' },
        { status: 400 }
      )
    }

    // Create workspace
    const workspace = await prisma.workspace.create({
      data: {
        name,
        ownerId: owner.id,
        plan,
        maxUsers,
        status: WorkspaceStatus.ACTIVE
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    })

    return NextResponse.json(workspace)
  } catch (error) {
    console.error('Error creating workspace:', error)
    return NextResponse.json(
      { error: 'Failed to create workspace' },
      { status: 500 }
    )
  }
}