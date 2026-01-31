# QA Report - CliniHOF

## Data: 2026-01-31
## Ambiente: Produção (clinihof.com)
## Testado por: Clawd QA Bot (Subagent)
## Browser: Clawd (Chromium headless)

---

### Páginas Testadas

| # | Página | URL | Status | Observações |
|---|--------|-----|--------|-------------|
| 1 | Painel (Admin) | /admin | ✅ OK | Renderiza com sidebar completa, botão "Popular Workspace", toggle theme, user info. |
| 2 | Agenda | /agenda | ✅ OK | Calendário mensal renderizado, botões "Novo Evento"/"Novo Agendamento", classificação visual de consultas (cores), eventos existentes visíveis no dia 31. |
| 3 | Pacientes | /patients | ✅ OK | Lista de pacientes com busca, botão "Novo Paciente", cards com nome/email/telefone e botões Ver/Editar/Excluir. |
| 4 | Orçamentos | /quotes | ✅ OK | Dashboard com cards de métricas (Total, Taxa Conversão, Valor, Convertido), filtro por status, botão "Novo Orçamento". Estado vazio com CTA "Criar Primeiro Orçamento". |
| 5 | Procedimentos | /procedures | ✅ OK | Formulário inline de novo procedimento com precificação inteligente (markup), insumos, mão de obra, análise financeira. Catálogo com tabela. |
| 6 | Colaboradores | /collaborators | ✅ OK | Formulário completo (dados pessoais, profissionais, financeiros), contadores no topo, lista de equipe. |
| 7 | Vendas/Atendimentos | /appointments | ✅ OK | Dashboard com métricas (Total Vendido, Vendas, Sessões), formulário "Nova Venda" com split de pagamentos, histórico de vendas. |
| 8 | Comissões | /comissoes | ✅ OK | Filtros de período e vendedor, cards de métricas, detalhamento de comissões. |
| 9 | Fluxo de Caixa | /cashflow | ✅ OK | Análise completa com gráficos (evolução diária, comparação, despesas por categoria), análise de pagamentos, tabelas detalhadas de recebíveis e despesas, insights financeiros. |
| 10 | Equipe | /team | ✅ OK | Lista de membros com busca, botão "Convidar Membro", cards com role badge e botões de ação. |
| 11 | Configurações | /configuracoes | ✅ OK | Custos da clínica (fixos + horas), integração Google Calendar (com status desconectado), botão "Salvar Configurações". |
| 12 | Minha Conta | /account | ✅ OK | Perfil editável (nome, clínica), alterar senha, foto de perfil, plano atual (CliniHOF Basic). |
| 13 | Painel Master | /master | ✅ OK | Dashboard master com métricas da plataforma (workspaces, usuários, receita), navegação própria (Workspaces, Usuários, Admins, Config). |

**Resultado: 13/13 páginas renderizaram corretamente ✅**

---

### Bugs Encontrados

#### 🔴 Bug Crítico

| # | Bug | Severidade | Localização | Detalhes |
|---|-----|-----------|-------------|----------|
| 1 | **Link "Vendas" na sidebar aponta para /admin** | 🔴 Crítico | Sidebar (todas as páginas) | O link "Vendas" na navegação lateral tem `href="/admin"` ao invés de `href="/appointments"`. Isso faz o usuário ir para a página de Administração ao invés da página de Vendas/Atendimentos. |

#### 🟡 Bugs Médios

| # | Bug | Severidade | Localização | Detalhes |
|---|-----|-----------|-------------|----------|
| 2 | **Select.Item com value vazio** | 🟡 Médio | Orçamentos (/quotes) | Erro no console: `A <Select.Item /> must have a value prop that is not an empty string`. Pode causar comportamento inesperado nos filtros de seleção. |
| 3 | **Discrepância nos valores do Fluxo de Caixa** | 🟡 Médio | /cashflow | Heading mostra "R$ 4.511,00", tabela totaliza "R$ 4.511,83", saldo líquido mostra "-R$ 4.512,00". Os três valores deveriam ser consistentes. |
| 4 | **Margem de Lucro mostra "-∞%"** | 🟡 Médio | /cashflow (Insights) | Quando não há receita, a margem exibe "-∞%" ao invés de "N/A" ou "0%". Não é user-friendly. |

#### 🟢 Bugs Baixos / Avisos

| # | Bug | Severidade | Localização | Detalhes |
|---|-----|-----------|-------------|----------|
| 5 | **Vercel API 404 (polling recorrente)** | 🟢 Baixo | Console (global) | Requisições repetidas a cada ~8s para `vercel.com/api/v1/projects/.../production-deployment` retornam 404. Parecem ser resquício do Vercel Speed Insights ou toolbar de deploy. Gera poluição no console. |
| 6 | **Stripe DNS não resolve** | 🟢 Baixo | Console (global) | `m.stripe.com` retorna ERR_NAME_NOT_RESOLVED. Provavelmente bloqueio de DNS no ambiente headless, mas pode indicar configuração de Stripe incompleta. |
| 7 | **Deploy polling 404 loop** | 🟢 Baixo | Console (global) | Após navegação, há polling contínuo para `vercel.com/api/v13/deployments/dpl_...` que retorna 404 em loop a cada ~3s. Desperdiça bandwidth e polui console. |

---

### Testes de CRUD

#### 1. Cadastrar Paciente (/patients)

| Etapa | Resultado | Detalhes |
|-------|-----------|----------|
| Abrir modal "Novo Paciente" | ✅ OK | Modal abre com campos: Nome*, E-mail, Telefone*, Data Nascimento, Origem, Observações |
| Preencher dados | ✅ OK | Nome: "João QA Teste", Email: joao.qa@teste.com, Tel: (21) 98888-7777 |
| Salvar | ✅ OK | Modal fecha, paciente aparece na lista imediatamente |
| Verificar na lista | ✅ OK | Card exibe nome, email e telefone corretos. Link "Ver" funciona. |

**Resultado: PASSOU ✅**

#### 2. Cadastrar Procedimento (/procedures)

| Etapa | Resultado | Detalhes |
|-------|-----------|----------|
| Formulário inline visível | ✅ OK | Campos: Nome*, Preço*, Duração, Markup, Insumos, Mão de Obra |
| Preencher dados | ✅ OK | Nome: "Botox QA Teste", Preço: R$ 500,00 |
| Salvar | ✅ OK | Procedimento adicionado ao catálogo |
| Verificar no catálogo | ✅ OK | Tabela mostra: Botox QA Teste | 0 insumos | 0 prof | R$ 500,00 | 100,0% margem |

**Resultado: PASSOU ✅**

#### 3. Criar Evento no Calendário (/agenda)

| Etapa | Resultado | Detalhes |
|-------|-----------|----------|
| Abrir modal "Novo Evento" | ✅ OK | Modal com campos: Título*, Descrição, Data Início/Fim, Horário, Tag |
| Botão "Criar Evento" disabled sem título | ✅ OK | Validação funciona - botão só habilita com título preenchido |
| Preencher dados | ✅ OK | Título: "Evento QA Automatizado", Data: 31/01/2026, 09:00-10:00 |
| Criar evento | ✅ OK | Modal fecha, evento aparece no calendário |
| Verificar no calendário | ✅ OK | Dia 31 mostra 3 eventos (badge "3"): Maria da Silva Teste, Reunião QA Teste, Evento QA Automatizado |

**Resultado: PASSOU ✅**

---

### Console Errors (Resumo)

| Tipo de Erro | Frequência | Impacto |
|--------------|-----------|---------|
| Vercel API 404 (deployment polling) | Recorrente (~8s) | Baixo - apenas console |
| Stripe DNS ERR_NAME_NOT_RESOLVED | Recorrente (~30s) | Baixo - funcionalidade Stripe pode estar comprometida |
| Select.Item empty value | Pontual (ao abrir /quotes) | Médio - pode afetar UX de filtros |
| Auth 401 (callback/credentials) | Histórico | Baixo - erros de tentativas anteriores de login |

---

### Recomendações

#### Prioridade Alta 🔴
1. **Corrigir link "Vendas" na sidebar** → Alterar de `/admin` para `/appointments`. Esse é o bug mais impactante pois confunde o usuário que tenta acessar a página de vendas.

#### Prioridade Média 🟡
2. **Corrigir Select.Item com value vazio** → Adicionar um value válido (ex: "all") para o item "Todos os Status" no filtro de orçamentos.
3. **Corrigir arredondamento no Fluxo de Caixa** → Garantir que o heading, a tabela e o saldo líquido usem os mesmos valores. Considerar usar `toFixed(2)` consistentemente.
4. **Tratar margem de lucro infinita** → Quando receita = 0, exibir "N/A" ou "Sem receita" ao invés de "-∞%".

#### Prioridade Baixa 🟢
5. **Remover/configurar Vercel Speed Insights polling** → O polling recorrente de deployment status gera ruído no console. Considerar desabilitar ou configurar corretamente.
6. **Verificar integração Stripe** → Confirmar se o domínio `m.stripe.com` é necessário e se há configuração pendente.
7. **Limpar deployment polling loop** → O polling para verificar status de deploy continua indefinidamente com 404. Implementar um backoff ou limite de tentativas.

#### Melhorias Sugeridas 💡
8. **Adicionar feedback visual ao salvar** → Algumas ações (como salvar procedimento) não mostram toast/notificação de sucesso visível.
9. **Responsividade** → Testar em viewports menores (mobile) - não testado neste QA.
10. **Acessibilidade** → Alguns botões de ação (editar/excluir) em tabelas não têm labels acessíveis, apenas ícones.

---

### Resumo Executivo

| Métrica | Valor |
|---------|-------|
| Páginas testadas | 13/13 |
| Páginas funcionais | 13/13 (100%) |
| CRUD Paciente | ✅ PASSOU |
| CRUD Procedimento | ✅ PASSOU |
| CRUD Evento Agenda | ✅ PASSOU |
| Bugs Críticos | 1 (link Vendas) |
| Bugs Médios | 3 |
| Bugs Baixos | 3 |
| Console errors (app) | 1 (Select.Item) |
| Console errors (infra) | 2 (Vercel polling, Stripe DNS) |

**Veredicto Geral: A aplicação está funcional e estável para uso. O único bug crítico é o link "Vendas" na sidebar que aponta para a URL errada. Os demais são cosméticos ou de infraestrutura.**
