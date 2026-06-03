# FlexBen

**FlexBen** é uma plataforma corporativa de **benefícios flexíveis** (créditos internos por categoria): realocação entre bolsos, utilização, aprovações gerenciais, governança de RH, fechamento financeiro e trilha de auditoria. Projeto acadêmico (TCC) em produção com stack moderna e deploy em nuvem gratuita.

| | |
|---|---|
| **Repositório** | [github.com/sabsnation/FlexBen](https://github.com/sabsnation/FlexBen) |
| **API (prod.)** | `https://flexben.onrender.com` |
| **Frontend (prod.)** | Vercel (proxy `/api` → Render) |
| **Idioma da UI** | Português (PT-BR) |
| **Código** | Inglês (variáveis, rotas, módulos) |

---

## Sumário

1. [Visão do produto](#visão-do-produto)
2. [Perfis e funcionalidades](#perfis-e-funcionalidades)
3. [Stack e arquitetura](#stack-e-arquitetura)
4. [Modelo de dados e domínio](#modelo-de-dados-e-domínio)
5. [API REST (principais rotas)](#api-rest-principais-rotas)
6. [Autenticação e segurança](#autenticação-e-segurança)
7. [Regras de negócio](#regras-de-negócio)
8. [Auditoria e notificações](#auditoria-e-notificações)
9. [Estrutura do repositório](#estrutura-do-repositório)
10. [Desenvolvimento local](#desenvolvimento-local)
11. [Deploy em produção](#deploy-em-produção)
12. [Variáveis de ambiente](#variáveis-de-ambiente)
13. [Contas de demonstração](#contas-de-demonstração)
14. [Documentação complementar](#documentação-complementar)

---

## Visão do produto

A empresa define **categorias** de benefício (Alimentação, Mobilidade, Saúde, etc.) com **limites/tetos**. Cada colaborador recebe **crédito** nessas categorias. O colaborador pode:

- **Realocar** saldo entre categorias (respeitando políticas e tetos).
- **Utilizar** crédito (registro de saída/gasto).

Operações sensíveis passam por **workflow** (Pendente → Em análise → Concluída/Reprovada). O **gestor** aprova ou reprova. O **RH/admin** governa categorias, usuários, políticas e cargas mensais. O **financeiro** consolida o **fechamento** do período (previsto × realizado, exportação CSV/PDF/Excel).

Eventos críticos são registrados em **auditoria** append-only (Firestore ou MongoDB, conforme ambiente).

---

## Perfis e funcionalidades

| Perfil | Rotas principais | Capacidades |
|--------|------------------|-------------|
| **Colaborador** | `/dashboard`, `/realocar`, `/utilizacao`, `/transacoes`, `/consulta-categorias` | Ver saldos, realocar, registrar utilização, histórico |
| **Gestor** | `/gestor/aprovacoes` | Fila de aprovações (realocações, alocações, tetos), SLA |
| **RH / Admin** | `/rh/politicas`, `/categorias`, `/usuarios`, `/carga`, `/auditoria`, `/cadastro` | Políticas, categorias, convite de usuários, carga mensal, auditoria |
| **Financeiro** | `/financeiro/fechamento`, `/financeiro/alocacao`, `/financeiro/tetos` | Fechamento, alocação de crédito, propostas de teto |

Cadastro público está **desativado**; novos acessos são criados pelo administrador (senha provisória ou **login Google**).

---

## Stack e arquitetura

### Tecnologias

| Camada | Tecnologia |
|--------|------------|
| Backend | Node.js 20+, Express, Prisma ORM |
| Banco principal | PostgreSQL (prod.) / SQLite (dev local) |
| Frontend | Vue 3 (Composition API), Vite 8, Vue Router |
| Auth | JWT (Bearer), Google Identity Services (OAuth ID token) |
| Auditoria | Firestore ou MongoDB (adapter configurável) |
| Mensageria | RabbitMQ (opcional) ou processamento inline |
| Deploy | Render (API + Postgres), Vercel (SPA) |

### Backend (camadas)

```
HTTP → Middleware (auth, roles) → Rotas (server.js / routes/*)
     → Domínio (policyEngine, businessAudit, ceilingProposals)
     → Prisma → PostgreSQL
     → Adapters (audit: Firestore | Mongo | Noop)
```

Padrões: **Adapter** (auditoria/mensageria), **Strategy** (políticas por role/categoria), **Repository implícito** (Prisma), **DTO** (`publicUser`, `serializeTransaction`).

### Frontend (camadas)

```
View (*.vue) → Composable (auth, transactions, …)
            → Repository (*ApiRepository) → HttpApiClient → API
```

Padrões: **Composable**, **Repository**, **Adapter HTTP**, **capabilities** (`config/capabilities.js`) + guards no `router.js`.

---

## Modelo de dados e domínio

Entidades principais (Prisma):

| Modelo | Descrição |
|--------|-----------|
| `User` | Colaborador/gestor/RH/financeiro; `authProvider` (`password` \| `google`); opcional `googleSub` |
| `Category` | Bolso de benefício (`nome`, `limite`, `status`) |
| `Transaction` | Movimento (`tipo`, `categoria`, `valor`, `status`, workflow) |
| `WorkflowEvent` | Histórico de decisões na transação |
| `PolicyRule` | Limites por role + categoria + centro de custo |
| `BenefitCeilingProposal` | Proposta de alteração de teto |
| `Notification` | Alertas in-app por usuário |
| `MonthlyLoad` / fechamento | Cargas e consolidação financeira |

**Status de transação (ex.):** Pendente, Em análise, Concluída, Reprovada.

**Fluxos típicos:**

- Colaborador realoca → pode exigir aprovação do gestor (par débito/crédito vinculado).
- Financeiro aloca crédito ou propõe teto → gestor aprova.
- Financeiro executa fechamento mensal → relatórios e exportações.

---

## API REST (principais rotas)

Base: `/api` — health: `GET /api/health` (inclui `googleAuth`, `audit`, `messaging`).

| Módulo | Métodos | Observação |
|--------|---------|------------|
| Auth | `POST /auth/login`, `POST /auth/google`, `GET /auth/me`, `PATCH /auth/profile`, `PATCH /auth/password` | JWT 12h |
| Usuários | `GET/POST /users`, `PATCH /users/:id/status`, `DELETE /users/:id` | Admin |
| Categorias | `GET/POST /categories`, `PATCH /categories/:id` | Admin / consulta |
| Transações | `GET/POST /transactions`, `POST /transactions/:id/workflow` | Escopo por role |
| Realocação | `POST /reallocations` | Valida saldo e política |
| Utilização | `POST /usage` | Colaborador |
| Gestor | `GET /manager/approvals`, `GET /manager/sla-summary` | Fila unificada |
| RH | `GET /rh/policies/summary` | Políticas e orçamento |
| Financeiro | `GET /finance/closing/summary`, exportações | Fechamento |
| Créditos | Rotas em `credits.routes.js` | Alocação por beneficiário |
| Tetos | `GET/POST /ceiling-proposals`, decisão gestor | Propostas |
| Carga | `POST /admin/monthly-load` | RH |
| Auditoria | `GET /admin/audit` | Admin |
| Notificações | `GET /notifications`, `PATCH …/read` | Por usuário |

Respostas de erro padronizadas (`message` em PT-BR). CORS configurado via `FRONTEND_URL` no backend.

---

## Autenticação e segurança

| Modo | Fluxo |
|------|--------|
| **Senha** | Admin convida com senha provisória → `POST /auth/login` |
| **Google** | Admin convida com `authProvider: google` → botão GIS no login → `POST /auth/google` (validação do ID token com `google-auth-library`) |

- Token JWT no header `Authorization: Bearer …`, armazenado em `localStorage` (`auth_token`).
- Middleware: `authRequired`, `adminRequired`, `roleRequired`.
- Senhas com **bcrypt**; contas Google não alteram senha no app.
- **Não commitar** `.env`, service accounts ou secrets.

**Google OAuth:** configurar `GOOGLE_CLIENT_ID` (Render) e `VITE_GOOGLE_CLIENT_ID` (Vercel) com o **mesmo** Client ID; origens autorizadas no Google Cloud (`localhost:5173` + URL da Vercel).

---

## Regras de negócio

Centralizadas em `backend/src/lib/policyEngine.js`:

- Limites por transação e teto mensal por role/categoria/centro de custo.
- Flag `requiresApproval` por política.
- Financeiro: realocações/alocações/tetos podem ir para **Em análise** até decisão do gestor.

Frontend valida formulários em `services/formValidators.js` e máscaras monetárias em `services/moneyFormat.js` (pt-BR).

---

## Auditoria e notificações

| Recurso | Implementação |
|---------|----------------|
| **Auditoria** | `logBusinessEvent` → adapter Firestore/Mongo/Noop (`AUDIT_PROVIDER`) |
| **Notificações** | Tabela `notifications` + sync na abertura do painel; eventos via RabbitMQ (`RABBITMQ_URL`) ou **inline** |

Eventos exemplo: login, criação de usuário, realocação, decisão de workflow, fechamento.

---

## Estrutura do repositório

```
.
├── README.md                 # Este arquivo
├── AGENTS.md                 # Regras para IA/desenvolvedores
├── CONTEXTUALIZACAO-PROJETO.md
├── DEPLOY.md                 # Render + Vercel passo a passo
├── docker-compose.yml        # Postgres + Mongo (profile audit)
├── render.yaml               # Blueprint Render
├── vercel.json               # Build SPA + rewrite /api
├── package.json              # npm run dev (monorepo)
│
├── backend/
│   ├── prisma/               # schema, migrations, seed
│   └── src/
│       ├── server.js           # Bootstrap e rotas
│       ├── middleware/         # auth
│       ├── lib/                # prisma, policy, audit, googleAuth
│       ├── routes/             # credits, etc.
│       └── adapters/           # audit, messaging
│
└── vue-app/
    └── src/
        ├── views/              # Telas por RF
        ├── components/         # PageHeader, KpiCard, Modal, …
        ├── composables/        # useBreakpoint, …
        ├── repositories/       # *ApiRepository
        ├── adapters/           # HttpApiClient
        ├── config/             # navigation, capabilities, googleAuth
        └── services/           # validators, moneyFormat
```

---

## Desenvolvimento local

### Pré-requisitos

- Node.js **20+**
- npm

### Instalação e execução

```bash
npm run install:all
cd backend && npm run db:push && npm run db:seed && cd ..
npm run dev
```

- Frontend: `http://localhost:5173` (Vite; proxy `/api` → `http://127.0.0.1:3333`)
- API: porta **3333**
- O `npm run dev` na raiz aguarda `/api/health` antes de subir o Vite (evita 502 no boot).

### Banco local

Padrão: **SQLite** (`backend/.env` → `DATABASE_URL=file:./dev.db`).

Opcional Postgres: `docker compose up -d postgres` e ajustar `DATABASE_URL`.

### Scripts úteis

| Comando | Onde |
|---------|------|
| `npm run dev` | Raiz — back + front |
| `npm run db:seed` | `backend/` — dados demo |
| `npm run build` | `vue-app/` — build produção |

---

## Deploy em produção

| Serviço | Função |
|---------|--------|
| **Vercel** | Build `vue-app`, rewrite `/api/*` → Render |
| **Render** | Web Service Node + PostgreSQL |

Guia completo: **[DEPLOY.md](DEPLOY.md)**.

Build Render (resumo): `npm install` → `prisma generate` → `prisma migrate deploy` → `db:seed`.

Health check: `GET /api/health` — verificar `"googleAuth": true` após configurar Google.

---

## Variáveis de ambiente

### Backend (`backend/.env`)

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | sim | SQLite (dev) ou Postgres (prod) |
| `JWT_SECRET` | sim | Assinatura JWT |
| `FRONTEND_URL` | prod | CORS (URL Vercel) |
| `GOOGLE_CLIENT_ID` | Google login | Mesmo ID do frontend |
| `FIREBASE_SERVICE_ACCOUNT` | audit Firestore | JSON one-line |
| `MONGODB_URI` | audit Mongo | Alternativa |
| `RABBITMQ_URL` | opcional | Fila de notificações |
| `AUDIT_PROVIDER` | opcional | `firestore` \| `mongo` \| `noop` |

Ver `backend/.env.example`.

### Frontend (`vue-app/.env`)

| Variável | Descrição |
|----------|-----------|
| `VITE_API_BASE_URL` | `/api` (proxy) ou URL direta do Render |
| `VITE_GOOGLE_CLIENT_ID` | Client ID OAuth (público) |

Ver `vue-app/.env.example` e `.env.development`.

---

## Contas de demonstração

Senha padrão: **`123`** (contas com `authProvider: password`).

| E-mail | Perfil |
|--------|--------|
| `sabrina.admin@empresa.com` | administrador |
| `gestor@empresa.com` | gestor |
| `financeiro@empresa.com` | financeiro |
| `joao.silva@empresa.com` | colaborador |

Lista completa em `backend/prisma/seed.js`.

---

## Documentação complementar

| Arquivo | Conteúdo |
|---------|----------|
| [AGENTS.md](AGENTS.md) | Padrões de código, design system, workflow do agente |
| [CONTEXTUALIZACAO-PROJETO.md](CONTEXTUALIZACAO-PROJETO.md) | Contexto acadêmico e estrutura |
| [DEPLOY.md](DEPLOY.md) | Render, Vercel, Firestore, RabbitMQ |

---

## Licença e uso

Projeto acadêmico (TCC). Uso e redistribuição conforme política do autor/repositório.

**FlexBen** — benefícios flexíveis com governança integrada (colaborador, gestor, RH e financeiro).
