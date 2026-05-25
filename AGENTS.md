# AGENTS.md — Diretrizes do projeto FlexBen

> Este arquivo é a **fonte da verdade** para qualquer agente (Cursor, Claude, etc.) e desenvolvedor humano trabalhando neste repositório. Toda regra abaixo é vinculante até que o usuário diga o contrário.

Última atualização: 2026-05-25

---

## 1. Identidade do projeto

| Campo | Valor |
|-------|-------|
| Nome interno | **FlexBen** |
| Nome de produto | **FlexBen** |
| Tipo | Sistema de benefícios flexíveis corporativos (TCC) |
| Stack | Node.js + Express, Vue 3 + Vite, Prisma + PostgreSQL, Firebase Firestore |
| Repositório | `github.com/sabsnation/FlexBen` (remote `flexben`) |
| Idioma do produto | Português (PT-BR) |
| Idioma do código | Inglês |

---

## 2. Domínio (uma frase)

A empresa define **categorias** com **limites**. O **colaborador** **realoca** crédito e **utiliza**. O **gestor** **aprova**. O **RH** governa políticas e cargas. O **financeiro** fecha o mês. Todos os eventos críticos vão para o **log de auditoria** (Firestore).

---

## 3. Estrutura definitiva do repositório

```
projeto/                          ← raiz (sem subpasta FlexBen)
├── AGENTS.md                     ← este arquivo
├── CONTEXTUALIZACAO-PROJETO.md   ← visão executiva
├── DEPLOY.md                     ← guia Vercel + Render
├── README.md
├── docker-compose.yml            ← postgres + mongo (profile audit)
├── render.yaml                   ← blueprint Render
├── vercel.json                   ← build da Vercel
├── package.json                  ← monorepo (scripts dev/build)
│
├── backend/                      ← API Node + Express + Prisma
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.js
│   ├── .env / .env.example
│   └── src/
│       ├── server.js             ← bootstrap + rotas (modularizar futuramente)
│       ├── middleware/           ← auth, errors
│       ├── lib/                  ← prisma, audit, businessAudit, policyEngine
│       └── adapters/audit/       ← Firestore | Mongo | Noop
│
├── vue-app/                      ← SPA Vue 3 + Vite
│   └── src/
│       ├── main.js
│       ├── App.vue
│       ├── router.js
│       ├── style.css             ← design system (tokens)
│       ├── api.js                ← fetch base
│       ├── auth.js, transactions.js, categories.js, users.js, toast.js
│       │                         ← composables (estado + orquestração)
│       ├── adapters/             ← HttpApiClient
│       ├── repositories/         ← *ApiRepository
│       ├── services/             ← regras puras (validators, helpers)
│       ├── config/               ← navigation, capabilities, projectScope
│       ├── components/           ← UI reutilizável
│       └── views/                ← telas (route components)
│
├── docs/                         ← documentação acadêmica (gitignore)
└── samples/                      ← arquivos de exemplo (CSV)
```

### Pendências de limpeza (sem urgência)

- [ ] Remover `vue-app/src/persistence/` (vazia, resquício do localStorage)
- [ ] Remover `backend/src/{config,data,middleware,utils,modules` (lixo de `mkdir` mal feito)
- [ ] Remover `backend/src/data/db.json` (mock antigo, hoje usa Prisma)
- [ ] Modularizar `backend/src/server.js` (~1.3k linhas) em `routes/<modulo>.js`

---

## 4. Padrões de projeto (Design Patterns)

Estes são os padrões **oficiais** do FlexBen. Toda nova feature deve respeitá-los.

### 4.1 Backend (Layered Architecture leve)

```
HTTP Request
  ↓
[Middleware]   ← auth, error handler (Express chain)
  ↓
[Routes]       ← server.js (futuramente: routes/<modulo>.js)
  ↓
[Domain]       ← lib/policyEngine.js, lib/businessAudit.js  (regras puras)
  ↓
[Data Access]  ← lib/prisma.js  (Repository implícito via Prisma Client)
  ↓
[Adapters]     ← adapters/audit/*  (integrações externas)
  ↓
PostgreSQL / Firestore
```

| Padrão | Onde | Por quê |
|--------|------|---------|
| **Adapter** | `adapters/audit/{Firestore,Mongo,Noop}AuditAdapter.js` | Trocar provider de auditoria sem mexer no resto |
| **Factory** | `adapters/audit/createAuditAdapter.js` | Seleção do adapter por variável de ambiente |
| **Repository (implícito)** | Prisma Client em `lib/prisma.js` | Abstrai SQL; novas tabelas seguem o padrão Prisma |
| **Strategy** | `lib/policyEngine.js` (`enforcePolicy`, `resolvePolicyRule`) | Regras por role/categoria selecionáveis em runtime |
| **Middleware (Chain of Responsibility)** | `middleware/auth.js` (`authRequired`, `adminRequired`, `roleRequired`) | Composição de checagens por rota |
| **DTO** | `publicUser()`, `serializeTransaction()` em `server.js` | Não vazar campos sensíveis (hash, etc.) |

**Regra de ouro:** rotas chamam `lib/*`; `lib/*` chama `prisma` ou `adapters/*`. Nunca o contrário.

### 4.2 Frontend (Composition API + Repository + Adapter)

```
[View]              ← src/views/*.vue  (apresentação)
  ↓ usa
[Composable]        ← src/auth.js, transactions.js, …  (estado reativo + orquestração)
  ↓ usa
[Service]           ← src/services/*  (regras puras: validar, calcular saldo)
  ↓ ou
[Repository]        ← src/repositories/*ApiRepository.js  (contrato com a API)
  ↓ usa
[Adapter]           ← src/adapters/HttpApiClient.js  (fetch base)
  ↓
HTTP → backend
```

| Padrão | Onde | Por quê |
|--------|------|---------|
| **Composable** (Vue 3) | `auth.js`, `transactions.js`, `categories.js`, `users.js`, `toast.js` | Estado reativo compartilhado entre views |
| **Repository** | `repositories/*ApiRepository.js` | Centralizar chamadas HTTP do mesmo domínio |
| **Adapter** | `adapters/HttpApiClient.js` | Encapsular fetch + token + parsing |
| **Strategy / Policy** | `config/capabilities.js` + guards em `router.js` | Permissões por role declarativas |
| **DTO (input/output)** | `services/formValidators.js` | Validar antes de chamar repositório |
| **Single source of truth** | Composables retornam instâncias singletons | Sem prop drilling para auth/categorias/transações |

**Regra de ouro:** views nunca chamam `fetch` direto. Sempre: **view → composable → repository → adapter HTTP**.

---

## 5. Design system (UI)

Aplicar em **toda** nova tela ou componente. Tokens em `vue-app/src/style.css`.

### Cores (já definidas)

| Token | Cor | Uso |
|-------|-----|-----|
| `--brand-primary` | `#6366f1` (índigo) | Botões, links, destaques |
| `--brand-primary-dark` | `#4f46e5` | Hover/pressed |
| `--brand-accent` | `#10b981` | Sucesso, entradas |
| `--brand-warn` | `#f59e0b` | Pendências |
| `--brand-danger` | `#ef4444` | Erros, saídas |
| `--bg-app` | `#f6f8fb` | Fundo da aplicação |
| `--surface` | `#ffffff` | Cards |
| `--text-main` | `#1e293b` | Texto padrão |
| `--text-muted` | `#64748b` | Texto secundário |

### Tipografia

- **Família:** `Inter` (com fallback system-ui)
- **Tamanhos:** seguir hierarquia de cards/headers — sem números mágicos novos
- **Pesos:** 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

### Espaçamento e raios

- Múltiplos de **4px** ou **8px**
- `--radius-lg: 18px` (cards), `--radius-md: 12px` (inputs, botões), `--radius-sm: 8px` (badges)
- Sombras: `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-xl`

### Componentes reutilizáveis (já existem — use sempre)

| Componente | Quando usar |
|-----------|------------|
| `PageHeader.vue` | Topo de toda view com título, subtítulo e ações |
| `KpiCard.vue` | Métricas grandes em dashboards |
| `StatusBadge.vue` | Status de transações (Concluída, Pendente, Em análise) |
| `EmptyState.vue` | Listas vazias |
| `Modal.vue` | Diálogos (convite, justificativa) |

**Nunca duplicar:** se precisa de algo parecido com um destes, estenda o componente existente.

### Princípios visuais

- Layout limpo, ar branco generoso
- Cards com `border-light` + `shadow-sm`
- Transições suaves (`var(--transition)`, 250ms ease-in-out)
- Estados de foco visíveis (acessibilidade)
- Iconografia: arquivo `public/icons.svg` (sprite SVG)

---

## 6. Convenções de código

| Item | Regra |
|------|-------|
| Idioma de variáveis/funções | Inglês (`totalSpent`, `approveTransaction`) |
| Idioma de strings da UI | Português (`'Aprovar transação'`) |
| Arquivos `.vue` | `PascalCase.vue` (`DashboardView.vue`) |
| Composables | `camelCase.js` com export `useXxx` (`auth.js → useAuth`) |
| Repositórios | `XxxApiRepository.js` exporta classe + instância singleton |
| Adapters | `XxxAdapter.js` (Backend) ou `XxxClient.js` (Frontend) |
| Indentação | 2 espaços, sem ponto-e-vírgula no JS (Vue/Vite default) |
| `import` | Relativos com `.js` e `.vue` |
| Comentários | Somente o que **não é óbvio** pelo código (intenção, restrição, trade-off) |
| Logs | `console.warn` para falhas degradáveis (audit); `console.error` para erros graves |

---

## 7. Workflow do agente (regras fixas)

| Regra | Detalhe |
|-------|---------|
| **Não commitar automaticamente** | Sob nenhuma hipótese. O usuário cuida do `git add/commit/push`. |
| **Não criar branches** | Trabalhar sempre no checkout atual. |
| **Não fazer `git push`** | Mesmo se o commit tiver sido feito antes desta regra. |
| **Validar antes de declarar pronto** | `node --check` (sintaxe) e/ou `npm run build` (frontend) |
| **Sempre responder em português** | UI e conversa com o usuário em PT-BR. |
| **Não criar arquivos sem necessidade** | Prefira editar. Não criar README, docs, etc. sem pedido. |
| **Preservar este arquivo** | Editar `AGENTS.md` só se o usuário pedir explicitamente. |
| **Padrões de projeto** | Não introduzir padrão novo sem alinhar (ver seções 4.1 e 4.2). |
| **Design system** | Toda UI nova reaproveita componentes existentes e tokens do `style.css`. |

---

## 8. Deploy e ambiente

| Ambiente | Local | URL |
|----------|-------|-----|
| Backend produção | Render | `https://flexben.onrender.com` |
| Frontend produção | Vercel | (URL da Vercel) |
| Postgres produção | Render Postgres (`flexben-db`) | interna |
| NoSQL produção | Firestore (`flexben-cea02`) | gerenciado |
| Postgres local | Docker (`docker compose up -d postgres`) | `localhost:5432` |
| Mongo local | Docker (`docker compose --profile audit up -d`) | `localhost:27017` |

**Variáveis críticas (Render):** `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `FIREBASE_SERVICE_ACCOUNT`, `AUDIT_PROVIDER=firestore`, `NODE_VERSION=20`.

**Variáveis críticas (Vercel):** `VITE_API_BASE_URL=https://flexben.onrender.com/api`.

Detalhes em [DEPLOY.md](DEPLOY.md).

---

## 9. Contas demo

Senha: **`123`** (todas).

| Email | Perfil |
|-------|--------|
| `sabrina.admin@empresa.com` | administrador |
| `joao.silva@empresa.com` | colaborador |
| `gestor@empresa.com` | gestor |
| `financeiro@empresa.com` | financeiro |

---

## 10. Rotas funcionais (RF)

| RF | Rota frontend | Endpoint backend principal |
|----|---------------|---------------------------|
| RF01 Login | `/login` | `POST /api/auth/login` |
| RF02 Cadastro | `/cadastro` | `POST /api/auth/register` |
| RF03 Dashboard | `/dashboard` | `GET /api/transactions` |
| RF04 Realocar | `/realocar` | `POST /api/transactions` |
| RF05 Utilizar | `/utilizacao` | `POST /api/transactions` |
| RF06 Transações | `/transacoes` | `GET /api/transactions` |
| RF07 Categorias | `/categorias`, `/consulta-categorias` | `GET/POST /api/categories` |
| RF08 Usuários (admin) | `/usuarios` | `GET/POST /api/users` |
| RF09 Aprovar (gestor) | `/gestor/aprovacoes` | `POST /api/transactions/:id/workflow` |
| RF10 Auditoria | `/auditoria` | `GET /api/admin/audit` |
| RF11 RH políticas | `/rh/politicas` | `GET /api/rh/policies/summary` |
| RF12 Financeiro | `/financeiro/fechamento` | `GET /api/finance/closing/summary` |

---

## 11. Próximas tarefas (backlog)

Em ordem de prioridade. Refletir aqui sempre que o usuário priorizar algo novo.

**Refinamento de UI (atual):**
- [ ] Revisar consistência de espaçamentos em todas as views
- [ ] Estados de loading mais polidos (skeletons em listas)
- [ ] Microinterações (hover, focus, transições) em botões e cards
- [ ] Empty states com ilustração leve

**Limpeza:**
- [ ] Remover diretórios mortos (`persistence/`, `data/db.json`, lixo do mkdir)
- [ ] Modularizar `server.js` em `routes/`

**Funcionalidade:**
- [ ] Edição inline de políticas pelo RH
- [ ] Filtro avançado de transações (data, status, categoria)
- [ ] Exportação de relatórios em PDF

**Qualidade:**
- [ ] Testes automatizados (Vitest no front, Vitest no back)
- [ ] OpenAPI/Swagger gerado a partir do server.js
- [ ] CI no GitHub Actions

---

## 12. Glossário rápido

| Termo | Significado |
|-------|-------------|
| **Categoria** | Bolso de crédito (Alimentação, Mobilidade, etc.) |
| **Realocação** | Mover saldo de uma categoria para outra |
| **Utilização** | Gasto de crédito (saída) |
| **Workflow** | Máquina de estados de uma transação |
| **Política** | Limite por role + categoria + centro de custo |
| **Fechamento** | Ciclo mensal consolidado pelo financeiro |
| **Auditoria** | Log append-only no Firestore (eventos imutáveis) |
