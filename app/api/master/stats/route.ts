export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'
import { getMasterSession, withMasterAuth } from '@/lib/master-auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  // Check if user has master auth
  const authError = await withMasterAuth(request)
  if (authError) return authError

  try {
    // Get global platform stats
    const [
      totalWorkspaces,
      totalUsers, 
      activeWorkspaces,
      suspendedWorkspaces,
      totalSales,
      totalRevenue
    ] = await Promise.all([
      // Total workspaces count
      prisma.workspace.count(),
      
      // Total users count
      prisma.user.count(),
      
      // Active workspaces count
      prisma.workspace.count({
        where: { status: 'ACTIVE' }
      }),
      
      // Suspended workspaces count
      prisma.workspace.count({
        where: { status: 'SUSPENDED' }
      }),
      
      // Total sales count across all workspaces
      prisma.sale.count(),
      
      // Total revenue across all workspaces
      prisma.sale.aggregate({
        _sum: {
          totalAmount: true
        }
      })
    ])

    const stats = {
      totalWorkspaces,
      totalUsers,
      activeWorkspaces,
      suspendedWorkspaces,
      cancelledWorkspaces: totalWorkspaces - activeWorkspaces - suspendedWorkspaces,
      totalSales,
      totalRevenue: totalRevenue._sum.totalAmount || 0
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching master stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}