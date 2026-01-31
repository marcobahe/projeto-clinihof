export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { setImpersonation, clearImpersonation, getImpersonation } from '@/lib/impersonation'
import { prisma } from '@/lib/db'

// POST - Iniciar impersonação
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || (session.user as any).role !== 'MASTER') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas usuários MASTER podem impersonar.' },
        { status: 403 }
      )
    }

    const { workspaceId } = await request.json()
    
    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se o workspace existe
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, name: true, status: true }
    })

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace não encontrado' },
        { status: 404 }
      )
    }

    if (workspace.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Workspace deve estar ativo para ser impersonado' },
        { status: 400 }
      )
    }

    // Salvar impersonação no cookie
    setImpersonation(workspace.id, workspace.name)

    return NextResponse.json({ 
      success: true,
      workspace: {
        id: workspace.id,
        name: workspace.name
      }
    })

  } catch (error) {
    console.error('Erro ao iniciar impersonação:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Encerrar impersonação
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || (session.user as any).role !== 'MASTER') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas usuários MASTER podem gerenciar impersonação.' },
        { status: 403 }
      )
    }

    clearImpersonation()

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Erro ao encerrar impersonação:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// GET - Status de impersonação
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || (session.user as any).role !== 'MASTER') {
      return NextResponse.json({ 
        isImpersonating: false,
        workspace: null 
      })
    }

    const impersonation = getImpersonation()

    return NextResponse.json({
      isImpersonating: !!impersonation,
      workspace: impersonation
    })

  } catch (error) {
    console.error('Erro ao verificar status de impersonação:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}