import { UserRole } from '@prisma/client'

// Mapa de permissões por recurso
export const PERMISSIONS = {
  // Dashboard home e métricas  
  dashboard: ['MASTER', 'ADMIN', 'MANAGER'],
  
  // Agenda - todos podem ver, mas USER só própria agenda
  agenda: ['MASTER', 'ADMIN', 'MANAGER', 'RECEPTIONIST', 'USER'],
  
  // Pacientes - RECEPTIONIST só visualizar
  patients: ['MASTER', 'ADMIN', 'MANAGER', 'RECEPTIONIST'],
  
  // Vendas/Caixa - apenas níveis superiores
  sales: ['MASTER', 'ADMIN', 'MANAGER'],
  
  // Procedimentos - RECEPTIONIST só visualizar  
  procedures: ['MASTER', 'ADMIN', 'MANAGER', 'RECEPTIONIST'],
  
  // Insumos - mesmas permissões que procedimentos
  supplies: ['MASTER', 'ADMIN', 'MANAGER', 'RECEPTIONIST'],
  
  // Pacotes - mesmas permissões que procedimentos
  packages: ['MASTER', 'ADMIN', 'MANAGER', 'RECEPTIONIST'],
  
  // Colaboradores - apenas níveis superiores
  collaborators: ['MASTER', 'ADMIN', 'MANAGER'],
  
  // Comissões - apenas ADMIN e MASTER
  commissions: ['MASTER', 'ADMIN'],
  
  // Fluxo de Caixa - apenas ADMIN e MASTER
  cashflow: ['MASTER', 'ADMIN'],
  
  // Equipe - MANAGER com limitações
  team: ['MASTER', 'ADMIN', 'MANAGER'],
  
  // Configurações - apenas ADMIN e MASTER
  settings: ['MASTER', 'ADMIN'],
  
  // Orçamentos
  quotes: ['MASTER', 'ADMIN', 'MANAGER', 'RECEPTIONIST'],
} as const

// Função para verificar se um role tem acesso a um recurso
export function canAccess(role: UserRole, resource: keyof typeof PERMISSIONS): boolean {
  if (!role || !resource) return false
  return (PERMISSIONS[resource] as readonly string[])?.includes(role) ?? false
}

// Função para verificar permissões de escrita (modificar dados)
export function canWrite(role: UserRole, resource: keyof typeof PERMISSIONS): boolean {
  // RECEPTIONIST tem apenas leitura em alguns recursos
  if (role === 'RECEPTIONIST') {
    return !['patients', 'procedures', 'quotes'].includes(resource)
  }
  
  // MANAGER não pode editar comissões, caixa e configurações
  if (role === 'MANAGER') {
    return !['commissions', 'cashflow', 'settings'].includes(resource)
  }
  
  // USER só pode editar própria agenda
  if (role === 'USER') {
    return resource === 'agenda'
  }
  
  // ADMIN e MASTER têm acesso total
  return ['ADMIN', 'MASTER'].includes(role)
}

// Função para verificar se pode gerenciar membros da equipe
export function canManageTeam(role: UserRole, targetRole?: UserRole): boolean {
  if (!canAccess(role, 'team')) return false
  
  // MASTER pode gerenciar todos
  if (role === 'MASTER') return true
  
  // ADMIN pode gerenciar todos exceto MASTER
  if (role === 'ADMIN') {
    return targetRole !== 'MASTER'
  }
  
  // MANAGER só pode convidar USER e RECEPTIONIST
  if (role === 'MANAGER') {
    return ['USER', 'RECEPTIONIST'].includes(targetRole || '')
  }
  
  return false
}

// Função para filtrar itens de menu baseado no role
export function getVisibleMenuItems(role: UserRole) {
  const menuItems = [
    { key: 'dashboard', name: 'Dashboard', href: '/admin', icon: 'BarChart3' },
    { key: 'agenda', name: 'Agenda', href: '/appointments', icon: 'Calendar' },
    { key: 'patients', name: 'Pacientes', href: '/patients', icon: 'Users' },
    { key: 'sales', name: 'Vendas', href: '/admin', icon: 'DollarSign' },
    { key: 'procedures', name: 'Procedimentos', href: '/procedures', icon: 'Stethoscope' },
    { key: 'collaborators', name: 'Colaboradores', href: '/collaborators', icon: 'UserCheck' },
    { key: 'quotes', name: 'Orçamentos', href: '/quotes', icon: 'FileText' },
    { key: 'commissions', name: 'Comissões', href: '/comissoes', icon: 'Percent' },
    { key: 'cashflow', name: 'Fluxo de Caixa', href: '/cashflow', icon: 'TrendingUp' },
    { key: 'team', name: 'Equipe', href: '/team', icon: 'Users2' },
    { key: 'settings', name: 'Configurações', href: '/settings', icon: 'Settings' },
  ]
  
  return menuItems.filter(item => canAccess(role, item.key as keyof typeof PERMISSIONS))
}