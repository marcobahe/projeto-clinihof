import { cookies } from 'next/headers'

const IMPERSONATION_COOKIE = 'clinihof_impersonate'

export function setImpersonation(workspaceId: string, workspaceName: string) {
  cookies().set(IMPERSONATION_COOKIE, JSON.stringify({ workspaceId, workspaceName }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 4, // 4 horas max
    path: '/',
  })
}

export function getImpersonation(): { workspaceId: string, workspaceName: string } | null {
  const cookie = cookies().get(IMPERSONATION_COOKIE)
  if (!cookie) return null
  try {
    return JSON.parse(cookie.value)
  } catch {
    return null
  }
}

export function clearImpersonation() {
  cookies().delete(IMPERSONATION_COOKIE)
}