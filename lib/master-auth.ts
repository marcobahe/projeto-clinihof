import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'

/**
 * Get master session and verify user has MASTER role
 * Returns session if user is MASTER, throws error otherwise
 */
export async function getMasterSession() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    throw new Error('Unauthorized: No session found')
  }
  
  if (session.user.role !== UserRole.MASTER) {
    throw new Error('Forbidden: Master access required')
  }
  
  return session
}

/**
 * Middleware to protect API routes that require MASTER role
 * Returns NextResponse with 403 if not MASTER
 */
export async function withMasterAuth(request: NextRequest) {
  try {
    await getMasterSession()
    return null // Pass through
  } catch (error: any) {
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    if (error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: 'Master access required' },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}