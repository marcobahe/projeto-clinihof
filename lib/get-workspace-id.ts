import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getImpersonation } from '@/lib/impersonation'
import { prisma } from '@/lib/db'
import { getUserWorkspace } from '@/lib/workspace'

export async function getEffectiveWorkspaceId(): Promise<string | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  
  // Se é MASTER e está impersonando, usar workspace impersonado
  if ((session.user as any).role === 'MASTER') {
    const impersonation = getImpersonation()
    if (impersonation) return impersonation.workspaceId
  }
  
  return (session.user as any).workspaceId || null
}

export async function getEffectiveWorkspace() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  
  // Se é MASTER e está impersonando, usar workspace impersonado
  if ((session.user as any).role === 'MASTER') {
    const impersonation = getImpersonation()
    if (impersonation) {
      return await prisma.workspace.findUnique({
        where: { id: impersonation.workspaceId },
      })
    }
  }
  
  // Fallback para o sistema atual (buscar workspace do usuário)
  return await getUserWorkspace((session.user as any).id)
}