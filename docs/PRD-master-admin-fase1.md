# PRD — Master Admin Panel (Fase 1)

## Objetivo
Criar painel administrativo Master para gestão da plataforma CliniHOF como SaaS.
O Master é o dono da plataforma (Marco) — tem visão e controle sobre todas as clínicas/workspaces.

## Escopo Fase 1
- Dashboard global com métricas
- Gestão de workspaces (clínicas)
- Gestão de usuários cross-workspace
- Ativar/desativar contas
- Layout e navegação separados

## Mudanças no Schema (Prisma)

### 1. Novo role MASTER
```prisma
enum UserRole {
  MASTER        // Dono da plataforma - acesso total
  ADMIN         // Dono da clínica - acesso ao workspace
  MANAGER       // Gerente - acesso limitado
  RECEPTIONIST  // Recepcionista - acesso básico
  USER          // Usuário comum
}
```

### 2. Campo status no Workspace
```prisma
model Workspace {
  // ... campos existentes ...
  status    WorkspaceStatus @default(ACTIVE)
  plan      String          @default("free")  // free, pro, enterprise
  maxUsers  Int             @default(5)
}

enum WorkspaceStatus {
  ACTIVE
  SUSPENDED
  CANCELLED
}
```

## Rotas e Páginas

### Layout Master: app/(master)/layout.tsx
- Sidebar própria com navegação master
- Header com "CliniHOF Admin"
- Proteção: só role MASTER acessa

### Páginas:

#### /master — Dashboard Global
- Cards: Total Workspaces, Total Usuários, Workspaces Ativos, Workspaces Suspensos
- Gráfico: Novos workspaces por mês (últimos 6 meses)
- Lista: Últimos workspaces criados
- Lista: Últimos logins

#### /master/workspaces — Gestão de Workspaces
- Tabela com: Nome, Owner, Plano, Status, Usuários, Criado em
- Filtros: Status, Plano, Busca por nome
- Ações: Ativar, Suspender, Ver detalhes
- Botão: Criar workspace manualmente

#### /master/workspaces/[id] — Detalhes do Workspace
- Info da clínica (nome, owner, plano, status)
- Métricas: vendas, pacientes, colaboradores
- Lista de usuários do workspace
- Ações: Alterar plano, Suspender/Ativar, Resetar dados exemplo

#### /master/users — Gestão de Usuários
- Tabela com: Nome, Email, Role, Workspace, Último login, Status
- Filtros: Role, Workspace, Busca
- Ações: Alterar role, Desativar, Resetar senha

#### /master/settings — Configurações Globais
- Planos disponíveis e limites
- Mensagem de manutenção
- Configurações default para novos workspaces

## APIs

### GET /api/master/stats
Retorna métricas globais da plataforma.

### GET /api/master/workspaces
Lista todos os workspaces com paginação e filtros.

### GET /api/master/workspaces/[id]
Detalhes de um workspace específico com métricas.

### PATCH /api/master/workspaces/[id]
Atualizar workspace (status, plano, maxUsers).

### GET /api/master/users
Lista todos os usuários com paginação e filtros.

### PATCH /api/master/users/[id]
Atualizar usuário (role, status).

### POST /api/master/workspaces
Criar workspace manualmente.

## Middleware de Proteção
Todas as rotas /api/master/* e páginas /(master)/* verificam:
1. Usuário autenticado
2. role === 'MASTER'
3. Se não, redirect para /dashboard

## Design
- Seguir mesmo padrão visual do dashboard (dark sidebar, cards roxos)
- Sidebar com ícones: Dashboard, Workspaces, Usuários, Configurações
- Badge "Master" no header para diferenciar do painel normal
- Usar mesmos componentes Shadcn/UI

## Navegação entre painéis
- Se user é MASTER: pode alternar entre Master Panel e Dashboard normal
- Botão no header: "Painel Master" / "Painel Clínica"

## Prioridade de Implementação
1. Schema changes (migration)
2. Middleware de proteção
3. APIs
4. Layout master
5. Dashboard global
6. Gestão de workspaces
7. Gestão de usuários
8. Configurações
