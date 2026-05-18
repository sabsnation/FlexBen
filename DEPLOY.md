# Deploy — Render (API) + Vercel (frontend)

Guia para publicar o **FlexBen / CorpBenefit Flex**.

| Serviço | Hospeda | URL típica |
|---------|---------|------------|
| **Render** | Backend Node.js + PostgreSQL | `https://flexben-api.onrender.com` |
| **Vercel** | Frontend Vue (SPA) | `https://seu-app.vercel.app` |

---

## Pré-requisitos

1. Repositório no **GitHub** (ou GitLab) com o código na raiz (`backend/`, `vue-app/`).
2. Conta em [render.com](https://render.com) e [vercel.com](https://vercel.com).

> O backend em produção usa **PostgreSQL** (não SQLite). O plano free do Render inclui banco Postgres.

---

## Parte 1 — Backend no Render

### Opção A — Blueprint (recomendado)

1. No Render: **New → Blueprint**.
2. Conecte o repositório e selecione o arquivo `render.yaml` na raiz.
3. Aplique o blueprint (cria **flexben-api** + **flexben-db**).
4. Após o deploy, copie a URL do serviço web, ex.:  
   `https://flexben-api.onrender.com`

### Opção B — Manual

1. **New → PostgreSQL** (free) → anote a **Internal Database URL**.
2. **New → Web Service**:
   - **Root Directory:** `backend`
   - **Build Command:**  
     `npm install && npx prisma generate && npx prisma migrate deploy && npm run db:seed`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/api/health`

3. **Environment variables:**

| Variável | Valor |
|----------|--------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | URL do Postgres (Render preenche se vincular o banco) |
| `JWT_SECRET` | string longa aleatória (Render pode gerar) |
| `FRONTEND_URL` | URL da Vercel (passo 2 abaixo), ex. `https://flexben.vercel.app` |

4. Deploy e teste:  
   `https://SUA-API.onrender.com/api/health` → deve retornar `{"ok":true,...}`

### Contas demo após o seed

Senha: **`123`**

- `sabrina.admin@empresa.com` (admin)
- `joao.silva@empresa.com` (colaborador)
- `gestor@empresa.com` (gestor)
- `financeiro@empresa.com` (financeiro)

> No plano **free**, o serviço “dorme” após inatividade; a primeira requisição pode levar ~30–60 s.

---

## Parte 2 — Frontend na Vercel

1. **Add New → Project** → importe o mesmo repositório.
2. Configuração do projeto:

| Campo | Valor |
|-------|--------|
| **Framework Preset** | Other (ou deixe detectar o `vercel.json` na raiz) |
| **Root Directory** | `.` (raiz do repo — o `vercel.json` já aponta para `vue-app/`) |

> **Importante:** se o Root Directory estiver `vue-app` *e* o build falhar com `vite: command not found`, volte para a **raiz** (`.`) ou use só o `vercel.json` da raiz do repositório.

Alternativa manual (sem `vercel.json` na raiz):

| Campo | Valor |
|-------|--------|
| **Root Directory** | `vue-app` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

3. **Environment Variables** (Production):

| Nome | Valor |
|------|--------|
| `VITE_API_BASE_URL` | `https://SUA-API.onrender.com/api` |

(substitua pela URL real do Render, **com** `/api` no final)

4. **Deploy**.

5. Copie a URL da Vercel (ex. `https://flexben.vercel.app`).

---

## Parte 3 — Ligar front e back

1. No **Render**, edite o serviço **flexben-api** e atualize:

   `FRONTEND_URL` = `https://SUA-URL.vercel.app`

   (sem barra no final; para preview branches, use vírgula:  
   `https://flexben.vercel.app,https://flexben-xxx.vercel.app`)

2. **Redeploy** do backend no Render.

3. Abra a Vercel, faça login com uma conta demo e valide o fluxo.

---

## Desenvolvimento local (com Postgres)

SQLite foi trocado por Postgres no schema. Para desenvolver localmente:

```bash
docker compose up -d
```

No `backend/.env`:

```env
DATABASE_URL="postgresql://corp:corp@localhost:5432/corpbenefit"
JWT_SECRET="dev-local"
PORT=3333
```

```bash
cd backend
npm run db:migrate
npm run db:seed
npm run dev
```

No `vue-app/.env`:

```env
VITE_API_BASE_URL=http://127.0.0.1:3333/api
```

---

## Checklist pós-deploy

- [ ] `GET /api/health` no Render retorna `ok: true`
- [ ] Login na Vercel funciona
- [ ] `FRONTEND_URL` no Render aponta para a URL da Vercel
- [ ] `VITE_API_BASE_URL` na Vercel aponta para `https://...onrender.com/api`

---

## Firebase (opcional)

Auditoria Firestore continua opcional. No Render, use `FIREBASE_SERVICE_ACCOUNT` com o JSON da service account em **uma linha** (variável secreta).
