'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Eye, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ImpersonationData {
  isImpersonating: boolean
  workspace: {
    workspaceId: string
    workspaceName: string
  } | null
}

export function ImpersonationBanner() {
  const [impersonationData, setImpersonationData] = useState<ImpersonationData | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkImpersonationStatus()
  }, [])

  const checkImpersonationStatus = async () => {
    try {
      const response = await fetch('/api/master/impersonate')
      if (response.ok) {
        const data = await response.json()
        setImpersonationData(data)
      }
    } catch (error) {
      console.error('Erro ao verificar status de impersonação:', error)
    } finally {
      setLoading(false)
    }
  }

  const exitImpersonation = async () => {
    try {
      const response = await fetch('/api/master/impersonate', {
        method: 'DELETE'
      })
      
      if (response.ok) {
        router.push('/master')
        router.refresh()
      }
    } catch (error) {
      console.error('Erro ao sair da impersonação:', error)
    }
  }

  if (loading) return null

  if (!impersonationData?.isImpersonating || !impersonationData.workspace) {
    return null
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white py-3 px-4 shadow-md">
      <div className="flex items-center justify-center max-w-7xl mx-auto">
        <div className="flex items-center space-x-3">
          <Eye className="h-5 w-5" />
          <span className="font-medium">
            Visualizando workspace: <strong>{impersonationData.workspace.workspaceName}</strong>
          </span>
          <span className="text-amber-100">—</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={exitImpersonation}
            className="text-white hover:bg-amber-600 hover:text-white py-1 px-3 h-auto"
          >
            <X className="h-4 w-4 mr-1" />
            Voltar ao Master
          </Button>
        </div>
      </div>
    </div>
  )
}