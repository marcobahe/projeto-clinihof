import { NextRequest, NextResponse } from 'next/server'
import { getMasterSession, withMasterAuth } from '@/lib/master-auth'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

export async function GET(request: NextRequest) {
  // Check if user has master auth
  const authError = await withMasterAuth(request)
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit
    
    const roleFilter = searchParams.get('role') as UserRole | null
    const search = searchParams.get('search') || ''

    // Build where clause
    const where: any = {}
    
    if (roleFilter && Object.values(UserRole).includes(roleFilter)) {
      where.role = roleFilter
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Get users with their workspaces
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          workspaces: {
            select: {
              id: true,
              name: true,
              status: true,
              plan: true
            }
          },
          sessions: {
            orderBy: {
              expires: 'desc'
            },
            take: 1,
            select: {
              expires: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      
      prisma.user.count({ where })
    ])

    // Format users with last login info
    const formattedUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      workspaces: user.workspaces,
      lastLogin: user.sessions[0]?.expires || null
    }))

    return NextResponse.json({
      users: formattedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}