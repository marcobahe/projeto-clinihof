import { DefaultSession } from 'next-auth'
import { UserRole } from '@prisma/client'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: UserRole
      workspaceId?: string | null
    } & DefaultSession['user']
  }

  interface User {
    role: UserRole
    workspaceId?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: UserRole
    workspaceId?: string | null
  }
}
