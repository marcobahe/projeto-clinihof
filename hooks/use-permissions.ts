import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { canAccess, canWrite, PERMISSIONS } from '@/lib/permissions'
import { UserRole } from '@prisma/client'

export function useRequirePermission(resource: keyof typeof PERMISSIONS, requireWrite = false) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    // Aguardar o carregamento da sessão
    if (status === 'loading') return

    // Se não está logado, redirecionar para login
    if (!session?.user) {
      router.push('/login')
      return
    }

    const userRole = session.user.role as UserRole
    
    // Verificar se tem permissão de leitura
    if (!canAccess(userRole, resource)) {
      router.push('/dashboard')
      return
    }

    // Se precisa de escrita, verificar permissão de escrita
    if (requireWrite && !canWrite(userRole, resource)) {
      router.push('/dashboard')
      return
    }
  }, [session, status, router, resource, requireWrite])

  return {
    hasAccess: session?.user ? canAccess(session.user.role as UserRole, resource) : false,
    canWrite: session?.user ? canWrite(session.user.role as UserRole, resource) : false,
    isLoading: status === 'loading',
    user: session?.user,
  }
}

export function usePermissions() {
  const { data: session } = useSession()
  
  return {
    canAccess: (resource: keyof typeof PERMISSIONS) => 
      session?.user ? canAccess(session.user.role as UserRole, resource) : false,
    canWrite: (resource: keyof typeof PERMISSIONS) => 
      session?.user ? canWrite(session.user.role as UserRole, resource) : false,
    role: session?.user?.role as UserRole | undefined,
    user: session?.user,
  }
}