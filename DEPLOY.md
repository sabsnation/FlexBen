# Deploy — Render (API) + Vercel (frontend)

Guia oficial do **FlexBen**. Cobre:

- Vercel (frontend Vue)
- Render (backend Node + PostgreSQL)
- Auditoria opcional: Firestore ou MongoDB (Atlas)
- Desenvolvimento local com Docker Compose (Postgres + Mongo)

| Serviço | Função | URL típica |
|---------|--------|------------|
| **Vercel** | Frontend Vue (SPA) | `https://flexben.vercel.app` |
| **Render** | Backend Node.js + PostgreSQL | `https://flexben.onrender.com` |
| **MongoDB Atlas** | Auditoria NoSQL (opcional) | `mongodb+srv://...` |
| **Firebase Firestore** | Auditoria NoSQL (opcional) | gerenciado |

---

## 1. Frontend na Vercel

### Configuração (Project Settings)

| Campo | Valor |
|-------|-------|
| **Framework Preset** | Other (detecta pelo `vercel.json` da raiz) |
| **Root Directory** | `.` |
| **Install Command** | _herdado do `vercel.json`_ |
| **Build Command** | _herdado do `vercel.json`_ |
| **Output Directory** | _herdado do `vercel.json`_ |

### Variáveis de ambiente (Production)

| Nome | Valor |
|------|-------|
| `VITE_API_BASE_URL` | `/api` (recomendado — o `vercel.json` encaminha para `https://flexben.onrender.com/api`) |

### Comandos (caso prefira manual, Root = `vue-app`)

| Campo | Valor |
|-------|-------|
| **Install Command** | `npm install` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |

---

## 2. Backend no Render

### Opção A — Blueprint (recomendado)

1. [dashboard.render.com](https://dashboard.render.com) → **New → Blueprint**
2. Conecte `sabsnation/FlexBen` → o `render.yaml` é detectado
3. Cria automaticamente:
   - **flexben-db** (PostgreSQL free)
   - **flexben-api** (Web Service Node)
4. Preencha `FRONTEND_URL` com a URL da Vercel
5. **Apply** → aguarde ~3–5 min

### Opção B — Manual (Web Service)

| Campo | Valor |
|-------|-------|
| **Environment** | Node |
| **Region** | Oregon (ou mais próxima) |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Build Command** | `npm install && npx prisma generate && npx prisma migrate deploy && npm run db:seed` |
| **Start Command** | `npm start` |
| **Health Check Path** | `/api/health` |
| **Auto-Deploy** | On |
| **Plan** | Free |

Primeiro crie um **PostgreSQL** em **New → PostgreSQL** (plano free) e copie a **Internal Database URL**.

### Variáveis de ambiente do backend

| Nome | Valor | Obrigatória |
|------|-------|------------|
| `NODE_ENV` | `production` | sim |
| `NODE_VERSION` | `20` | sim |
| `DATABASE_URL` | Internal URL do Postgres | sim |
| `JWT_SECRET` | string aleatória longa | sim |
| `FRONTEND_URL` | URL da Vercel (sem `/` final) | sim em produção |
| `AUDIT_PROVIDER` | `firestore` ou `mongo` ou `noop` (opcional) | não |
| `FIREBASE_SERVICE_ACCOUNT` | JSON da service account em 1 linha | só se Firestore |
| `MONGODB_URI` | string `mongodb+srv://...` | só se MongoDB |
| `MONGODB_DB` | nome do DB | só se MongoDB |

> No plano **free**, o serviço “dorme” após ~15 min sem uso. A primeira requisição pode levar ~30–60 s.

---

## 3. Health check

Endpoint: **`GET /api/health`**

Resposta esperada:

```json
{
  "ok": true,
  "uptimeSeconds": 42,
  "env": "production",
  "database": "postgresql",
  "audit": { "provider": "noop", "ready": false },
  "timestamp": "2026-05-25T16:10:00.000Z"
}
```

Use para:

- Render: já configurado em `healthCheckPath`
- Monitoramento externo (UptimeRobot, BetterStack, etc.)

---

## 4. Auditoria — Firestore ou MongoDB

O backend tem 3 adapters (padrão Adapter):

| Provider | Quando usar | Vars |
|----------|-------------|------|
| `noop` | Sem auditoria persistente | (nenhuma) |
| `firestore` | Já uso Firebase | `FIREBASE_SERVICE_ACCOUNT` |
| `mongo` | Quero NoSQL gerenciado fora do Google | `MONGODB_URI` + `MONGODB_DB` |

Seleção:

- Defina `AUDIT_PROVIDER` (explícito) **ou**
- Deixe o factory auto-detectar pelas credenciais

### Firestore (Firebase)

1. Firebase Console → Engrenagem → Contas de serviço → **Gerar nova chave privada**
2. No Render, cole o JSON em **uma linha** na variável `FIREBASE_SERVICE_ACCOUNT`
3. Habilite o **Firestore Database**

### MongoDB Atlas

1. [cloud.mongodb.com](https://cloud.mongodb.com) → crie cluster free **M0**
2. Em **Network Access**, libere `0.0.0.0/0` (ou IPs do Render)
3. Em **Database Access**, crie usuário/senha
4. Em **Connect → Drivers**, copie a connection string (`mongodb+srv://...`)
5. No Render:
   - `MONGODB_URI` = a string completa
   - `MONGODB_DB` = `flexben`
6. Pronto — o adapter cria a coleção `audit_events` automaticamente

---

## 5. Desenvolvimento local

### Postgres (sempre)

```bash
docker compose up -d postgres
```

`backend/.env`:

```env
DATABASE_URL="postgresql://corp:corp@localhost:5432/corpbenefit"
JWT_SECRET="dev-local"
PORT=3333
```

### MongoDB (apenas se for testar auditoria)

```bash
docker compose --profile audit up -d
```

`backend/.env` adicional:

```env
AUDIT_PROVIDER=mongo
MONGODB_URI="mongodb://corp:corp@localhost:27017/flexben?authSource=admin"
MONGODB_DB=flexben
```

### Subir tudo

```bash
cd backend
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Frontend:

```bash
cd vue-app
npm install
echo "VITE_API_BASE_URL=http://127.0.0.1:3333/api" > .env.local
npm run dev
```

---

## 6. Contas demo (após seed)

Senha: **`123`**

| Email | Perfil |
|-------|--------|
| `sabrina.admin@empresa.com` | administrador |
| `joao.silva@empresa.com` | colaborador |
| `gestor@empresa.com` | gestor |
| `financeiro@empresa.com` | financeiro |

---

## 7. Checklist pós-deploy

- [ ] `GET /api/health` retorna `ok: true` no Render
- [ ] `database: "postgresql"` no health
- [ ] Login na Vercel funciona
- [ ] `FRONTEND_URL` no Render = URL da Vercel
- [ ] `VITE_API_BASE_URL` na Vercel = `https://...onrender.com/api`
- [ ] (Opcional) `audit.provider` no health = `firestore` ou `mongo`

---

## 8. Troubleshooting rápido

| Sintoma | Causa provável | Correção |
|---------|----------------|----------|
| Vercel `vite: command not found` | Root errado ou vue-app não versionado | Root = `.` e commitar `vue-app/` |
| Vercel `package.json não encontrado` | `vue-app` era submódulo | `git rm --cached vue-app && git add vue-app/` |
| Render `prisma migrate` falha | `DATABASE_URL` errada / Postgres não criado | Vincular `flexben-db` no Blueprint |
| Login retorna CORS | `FRONTEND_URL` não preenchida | Atualizar variável e redeploy |
| Auditoria não grava | `AUDIT_PROVIDER`/credencial faltando | Conferir `/api/health.audit.ready` |
