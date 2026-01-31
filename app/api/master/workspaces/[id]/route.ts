export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'
import { getMasterSession, withMasterAuth } from '@/lib/master-auth'
import { prisma } from '@/lib/db'
import { WorkspaceStatus } from '@prisma/client'

interface RouteParams {
  params: {
    id: string
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

    // Get workspace details with metrics
    const workspace = await prisma.workspace.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true
          }
        },
        _count: {
          select: {
            patients: true,
            procedures: true,
            sales: true,
            collaborators: true,
            supplies: true,
            costs: true,
            packages: true
          }
        }
      }
    })

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      )
    }

    // Get financial metrics
    const [totalRevenue, monthlyRevenue, totalCosts] = await Promise.all([
      // Total revenue
      prisma.sale.aggregate({
        where: { workspaceId: id },
        _sum: {
          totalAmount: true
        }
      }),
      
      // Monthly revenue (current month)
      prisma.sale.aggregate({
        where: {
          workspaceId: id,
          saleDate: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        },
        _sum: {
          totalAmount: true
        }
      }),
      
      // Total costs
      prisma.cost.aggregate({
        where: { workspaceId: id, isActive: true },
        _sum: {
          fixedValue: true
        }
      })
    ])

    const metrics = {
      ...workspace._count,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      monthlyRevenue: monthlyRevenue._sum.totalAmount || 0,
      totalCosts: totalCosts._sum.fixedValue || 0
    }

    return NextResponse.json({
      ...workspace,
      metrics
    })
  } catch (error) {
    console.error('Error fetching workspace details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workspace details' },
      { status: 500 }
    )
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
    
    const { status, plan, maxUsers } = body

    // Validate input
    const updateData: any = {}
    
    if (status && Object.values(WorkspaceStatus).includes(status)) {
      updateData.status = status
    }
    
    if (plan && ['free', 'pro', 'enterprise'].includes(plan)) {
      updateData.plan = plan
    }
    
    if (maxUsers && typeof maxUsers === 'number' && maxUsers > 0) {
      updateData.maxUsers = maxUsers
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // Update workspace
    const workspace = await prisma.workspace.update({
      where: { id },
      data: updateData,
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
    console.error('Error updating workspace:', error)
    
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update workspace' },
      { status: 500 }
    )
  }
}