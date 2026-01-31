# PRD — Fase 2: Gestão de Usuários e Permissões

## Objetivo
1. Permitir que ADMINs de clínicas convidem e gerenciem usuários no workspace
2. Permitir múltiplos usuários MASTER no painel administrativo
3. Implementar permissões por role na UI

## PARTE 1: Convite de Usuários no Workspace

### Página: app/(dashboard)/team/page.tsx — "Equipe"
- Tabela: lista todos os membros do workspace atual
- Colunas: Nome, Email, Role, Adicionado em, Ações
- Botão "Convidar Membro" abre modal/dialog
- Modal de convite: Email, Role (select: MANAGER, RECEPTIONIST, USER), botão Enviar
- Ao convidar: cria o user com senha temporária (ou envia link de ativação)
- Ações na tabela: Alterar role (dropdown), Remover do workspace
- Só ADMIN e MANAGER podem ver essa página
- ADMIN pode alterar qualquer role. MANAGER só pode adicionar USER/RECEPTIONIST

### API: app/api/team/route.ts
- GET: lista membros do workspace do user logado
- POST: criar/convidar novo membro (email, role, name)
  - Se email já existe no sistema: adiciona ao workspace (cria WorkspaceMember ou atualiza workspaceId)
  - Se email não existe: cria user novo com senha temporária gerada (ex: "Trocar@123") e workspaceId
  - Validar limite de maxUsers do workspace

### API: app/api/team/[id]/route.ts
- PATCH: alterar role do membro
- DELETE: remover membro do workspace (não deleta o user, só desvincula)

### Sidebar do Dashboard
- Adicionar item "Equipe" no menu (ícone Users)
- Visível apenas para ADMIN e MANAGER

## PARTE 2: Múltiplos Masters

### Mudança conceitual
- MASTER não é vinculado a um workspace específico — é um role de plataforma
- Um user MASTER pode ou não ter workspace próprio
- No Painel Master, adicionar página de gestão de Masters

### Página: app/(master)/master/admins/page.tsx — "Administradores"
- Título: "Administradores da Plataforma"
- Tabela: Nome, Email, Adicionado em, Status
- Botão "Adicionar Administrador"
- Modal: Email do usuário existente → promove para MASTER
- Ou: criar novo user MASTER (email, nome, senha)
- Ação: Revogar acesso Master (rebaixa para ADMIN ou USER)
- Proteção: não pode revogar o próprio acesso (evitar lock-out)

### API: app/api/master/admins/route.ts
- GET: lista todos os users com role MASTER
- POST: promover user existente para MASTER ou criar novo user MASTER

### API: app/api/master/admins/[id]/route.ts
- PATCH: alterar status do admin
- DELETE: revogar role MASTER (rebaixar para ADMIN)
  - Não pode deletar o próprio user logado
  - Precisa ter pelo menos 1 MASTER no sistema

### Sidebar do Master Panel
- Adicionar item "Administradores" no menu (ícone Shield/Crown)
- Entre "Usuários" e "Configurações"

## PARTE 3: Permissões por Role na UI do Dashboard

### Regras de visibilidade por role:

| Funcionalidade | ADMIN | MANAGER | RECEPTIONIST | USER |
|---|---|---|---|---|
| Dashboard (métricas) | ✅ Tudo | ✅ Tudo | ❌ Não vê | ❌ Não vê |
| Agenda | ✅ | ✅ | ✅ | ✅ (só própria) |
| Pacientes | ✅ | ✅ | ✅ (só visualizar) | ❌ |
| Vendas/Caixa | ✅ | ✅ | ❌ | ❌ |
| Procedimentos | ✅ | ✅ | ✅ (visualizar) | ❌ |
| Colaboradores | ✅ | ✅ | ❌ | ❌ |
| Comissões | ✅ | ❌ | ❌ | ❌ |
| Fluxo de Caixa | ✅ | ❌ | ❌ | ❌ |
| Equipe | ✅ | ✅ (limitado) | ❌ | ❌ |
| Configurações | ✅ | ❌ | ❌ | ❌ |

### Implementação:
- Criar helper `lib/permissions.ts` com função `canAccess(role, resource)`
- No layout do dashboard, filtrar itens do sidebar baseado no role
- Nas APIs, verificar permissão antes de retornar dados
- Nas páginas, redirect se user não tem permissão

### Arquivo lib/permissions.ts:
```typescript
export const PERMISSIONS = {
  dashboard: ['MASTER', 'ADMIN', 'MANAGER'],
  agenda: ['MASTER', 'ADMIN', 'MANAGER', 'RECEPTIONIST', 'USER'],
  patients: ['MASTER', 'ADMIN', 'MANAGER', 'RECEPTIONIST'],
  sales: ['MASTER', 'ADMIN', 'MANAGER'],
  procedures: ['MASTER', 'ADMIN', 'MANAGER', 'RECEPTIONIST'],
  collaborators: ['MASTER', 'ADMIN', 'MANAGER'],
  commissions: ['MASTER', 'ADMIN'],
  cashflow: ['MASTER', 'ADMIN'],
  team: ['MASTER', 'ADMIN', 'MANAGER'],
  settings: ['MASTER', 'ADMIN'],
}

export function canAccess(role: string, resource: keyof typeof PERMISSIONS): boolean {
  return PERMISSIONS[resource]?.includes(role) ?? false
}
```

## REGRAS DE IMPLEMENTAÇÃO:
- Use 'use client' nas páginas que precisam de hooks
- Use mesmos componentes Shadcn/UI (Dialog, Table, Select, Badge, Button, etc)
- Mesmo padrão visual (dark sidebar, cards gradiente)
- Toast notifications para sucesso/erro
- Responsivo desktop + mobile
- Import prisma de '@/lib/db' (NÃO de '@/lib/prisma')
- Import authOptions de '@/lib/auth' (NÃO da rota nextauth)
- SelectItem value nunca pode ser string vazia "" — usar "all" para "Todos"

## AO FINAL:
- git add .
- git commit -m "feat: Phase 2 - team management, multiple masters, role permissions"
- git push origin main
