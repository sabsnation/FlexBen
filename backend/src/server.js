import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { prisma } from './lib/prisma.js'
import {
  fetchRecentAudit,
  isFirestoreReady,
  isFirebaseCredentialEnvSet,
  isMongoCredentialEnvSet,
  isAuditReady,
  getAuditProvider,
  getFirestoreInitError
} from './lib/audit.js'
import { logBusinessEvent } from './lib/businessAudit.js'
import { enforcePolicy, resolvePolicyRule } from './lib/policyEngine.js'
import { authRequired, adminRequired, roleRequired } from './middleware/auth.js'

const PORT = Number(process.env.PORT || 3333)
const JWT_SECRET = process.env.JWT_SECRET || 'flexben-dev-secret'
const NODE_ENV = process.env.NODE_ENV || 'development'
const FRONTEND_URLS = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const app = express()
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true)
      if (NODE_ENV !== 'production') return callback(null, true)
      if (FRONTEND_URLS.length === 0) return callback(null, true)
      if (FRONTEND_URLS.includes(origin)) return callback(null, true)
      return callback(null, false)
    },
    credentials: true
  })
)
app.use(express.json())
app.use(morgan('dev'))

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
}

function publicUser(user) {
  return {
    id: user.id,
    nome: user.nome,
    email: user.email,
    role: user.role,
    status: user.status,
    dataCadastro: user.dataCadastro,
    initials: user.nome
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
}

function serializeTransaction(row) {
  return {
    id: row.id,
    userEmail: row.user.email,
    data: row.data,
    tipo: row.tipo,
    categoria: row.categoria,
    valor: Number(row.valor),
    status: row.status,
    descricao: row.descricao || ''
  }
}

function parseMoney(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return Math.round(n * 100) / 100
}

function parsePtBrDate(value) {
  if (!value || typeof value !== 'string') return null
  const parts = value.split('/')
  if (parts.length !== 3) return null
  const [dd, mm, yyyy] = parts.map((x) => Number(x))
  if (!dd || !mm || !yyyy) return null
  const d = new Date(yyyy, mm - 1, dd)
  if (Number.isNaN(d.getTime())) return null
  return d
}

function daysBetween(a, b = new Date()) {
  const start = a instanceof Date ? a : null
  if (!start) return 0
  const diff = b.getTime() - start.getTime()
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

function parseMonthYearQuery(query) {
  const month = Number(query.month || 0)
  const year = Number(query.year || 0)
  if (!month || !year || month < 1 || month > 12 || year < 2000) {
    const now = new Date()
    return { month: now.getMonth() + 1, year: now.getFullYear() }
  }
  return { month, year }
}

function dateMatchesMonthYear(ptBrDate, month, year) {
  const d = parsePtBrDate(ptBrDate)
  if (!d) return false
  return d.getMonth() + 1 === month && d.getFullYear() === year
}

const WORKFLOW_STATUS = Object.freeze({
  EM_ANALISE: 'Em análise',
  APROVADO: 'Aprovado',
  REPROVADO: 'Reprovado',
  LIQUIDADO: 'Liquidado',
  CONCLUIDA: 'Concluída',
  PENDENTE: 'Pendente'
})

function serializeWorkflowEvent(event) {
  return {
    id: event.id,
    transactionId: event.transactionId,
    fromStatus: event.fromStatus,
    toStatus: event.toStatus,
    actorEmail: event.actorEmail,
    note: event.note || '',
    createdAt: event.createdAt
  }
}

async function transitionStatus({
  transactionId,
  toStatus,
  actorEmail,
  note = '',
  tx = prisma
}) {
  const current = await tx.transaction.findUnique({ where: { id: transactionId } })
  if (!current) throw new Error('Transação não encontrada para transição.')
  const updated = await tx.transaction.update({
    where: { id: transactionId },
    data: { status: toStatus }
  })
  await tx.workflowEvent.create({
    data: {
      transactionId,
      fromStatus: current.status,
      toStatus,
      actorEmail,
      note: note || null,
      createdAt: new Date().toISOString()
    }
  })
  return updated
}

async function balanceInCategory(userId, categoria) {
  const txs = await prisma.transaction.findMany({
    where: { userId, categoria }
  })
  return txs.reduce(
    (acc, t) => (t.tipo === 'Entrada' ? acc + Number(t.valor) : acc - Number(t.valor)),
    0
  )
}

app.get(
  '/api/health',
  asyncHandler(async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`
    res.json({
      ok: true,
      uptimeSeconds: Math.round(process.uptime()),
      env: NODE_ENV,
      database: process.env.DATABASE_URL?.startsWith('postgres') ? 'postgresql' : 'configured',
      audit: {
        provider: getAuditProvider(),
        ready: isAuditReady()
      },
      timestamp: new Date().toISOString()
    })
  })
)

app.post(
  '/api/auth/login',
  asyncHandler(async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase()
    const senha = String(req.body?.senha || '')
    if (!email || !senha) {
      return res.status(400).json({ message: 'E-mail e senha são obrigatórios.' })
    }
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(401).json({ message: 'E-mail ou senha incorretos.' })
    const ok = await bcrypt.compare(senha, user.passwordHash)
    if (!ok) return res.status(401).json({ message: 'E-mail ou senha incorretos.' })
    if (user.status !== 'Ativo') {
      return res.status(403).json({ message: 'Conta inativa. Procure o RH.' })
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '12h' }
    )
    await logBusinessEvent({
      action: 'LOGIN',
      actorEmail: user.email,
      module: 'auth',
      entityId: user.id,
      payload: { userId: user.id }
    })
    res.json({ token, user: publicUser(user) })
  })
)

app.post(
  '/api/auth/register',
  asyncHandler(async (req, res) => {
    const nome = String(req.body?.nome || '').trim()
    const email = String(req.body?.email || '').trim().toLowerCase()
    const senha = String(req.body?.senha || '')
    if (nome.length < 2) return res.status(400).json({ message: 'Nome inválido.' })
    if (!email.includes('@')) return res.status(400).json({ message: 'E-mail inválido.' })
    if (senha.length < 6) {
      return res.status(400).json({ message: 'Senha deve ter ao menos 6 caracteres.' })
    }
    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) return res.status(409).json({ message: 'Este e-mail já está cadastrado.' })
    const passwordHash = await bcrypt.hash(senha, 10)
    const user = await prisma.user.create({
      data: {
        nome,
        email,
        passwordHash,
        role: 'colaborador',
        status: 'Ativo',
        dataCadastro: new Date().toLocaleDateString('pt-BR')
      }
    })
    await logBusinessEvent({
      action: 'USER_REGISTER',
      actorEmail: user.email,
      module: 'auth',
      entityId: user.id,
      payload: { userId: user.id }
    })
    res.status(201).json({ user: publicUser(user) })
  })
)

app.get(
  '/api/auth/me',
  authRequired,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.auth.id } })
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' })
    res.json({ user: publicUser(user) })
  })
)

app.post(
  '/api/auth/recover',
  asyncHandler(async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase()
    if (!email.includes('@')) {
      return res.status(400).json({ message: 'E-mail inválido.' })
    }
    res.json({
      ok: true,
      message: 'Se o e-mail existir, você receberá instruções.'
    })
  })
)

app.get(
  '/api/users',
  authRequired,
  adminRequired,
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({ orderBy: { id: 'asc' } })
    res.json({ users: users.map(publicUser) })
  })
)

app.post(
  '/api/users',
  authRequired,
  adminRequired,
  asyncHandler(async (req, res) => {
    const nome = String(req.body?.nome || '').trim()
    const email = String(req.body?.email || '').trim().toLowerCase()
    const senha = String(req.body?.senha || '')
    const role = String(req.body?.role || 'colaborador').trim().toLowerCase()
    const allowedRoles = ['colaborador', 'gestor', 'administrador', 'financeiro']
    if (nome.length < 2) return res.status(400).json({ message: 'Nome inválido.' })
    if (!email.includes('@')) return res.status(400).json({ message: 'E-mail inválido.' })
    if (senha.length < 6) {
      return res.status(400).json({ message: 'Senha deve ter ao menos 6 caracteres.' })
    }
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: 'Perfil inválido.' })
    }
    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) return res.status(409).json({ message: 'Este e-mail já está cadastrado.' })
    const passwordHash = await bcrypt.hash(senha, 10)
    const user = await prisma.user.create({
      data: {
        nome,
        email,
        passwordHash,
        role,
        status: 'Ativo',
        dataCadastro: new Date().toLocaleDateString('pt-BR')
      }
    })
    await logBusinessEvent({
      action: 'USER_CREATED_BY_ADMIN',
      actorEmail: req.auth.email,
      module: 'users',
      entityId: user.id,
      payload: { userId: user.id, role }
    })
    res.status(201).json({ user: publicUser(user) })
  })
)

app.patch(
  '/api/users/:id/status',
  authRequired,
  adminRequired,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' })
    const status = user.status === 'Ativo' ? 'Inativo' : 'Ativo'
    const updated = await prisma.user.update({
      where: { id },
      data: { status }
    })
    await logBusinessEvent({
      action: 'USER_STATUS_TOGGLE',
      actorEmail: req.auth.email,
      module: 'users',
      entityId: id,
      payload: { targetId: id, newStatus: status }
    })
    res.json({ user: publicUser(updated) })
  })
)

app.delete(
  '/api/users/:id',
  authRequired,
  adminRequired,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    const target = await prisma.user.findUnique({ where: { id } })
    if (!target) return res.status(404).json({ message: 'Usuário não encontrado.' })
    await prisma.user.delete({ where: { id } })
    await logBusinessEvent({
      action: 'USER_DELETED',
      actorEmail: req.auth.email,
      module: 'users',
      entityId: id,
      payload: { deletedEmail: target.email }
    })
    res.status(204).send()
  })
)

app.get(
  '/api/categories',
  authRequired,
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({ orderBy: { id: 'asc' } })
    res.json({
      categories: categories.map((c) => ({
        id: c.id,
        nome: c.nome,
        limite: Number(c.limite),
        status: c.status
      }))
    })
  })
)

app.post(
  '/api/categories',
  authRequired,
  adminRequired,
  asyncHandler(async (req, res) => {
    const nome = String(req.body?.nome || '').trim()
    const limite = parseMoney(req.body?.limite)
    if (nome.length < 2 || !limite || limite <= 0) {
      return res.status(400).json({ message: 'Nome e limite válidos são obrigatórios.' })
    }
    const category = await prisma.category.create({
      data: { nome, limite, status: 'Ativa' }
    })
    await logBusinessEvent({
      action: 'CATEGORY_CREATED',
      actorEmail: req.auth.email,
      module: 'categories',
      entityId: category.id,
      payload: { categoryId: category.id, nome }
    })
    res.status(201).json({
      category: {
        id: category.id,
        nome: category.nome,
        limite: Number(category.limite),
        status: category.status
      }
    })
  })
)

app.delete(
  '/api/categories/:id',
  authRequired,
  adminRequired,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    const cat = await prisma.category.findUnique({ where: { id } })
    if (!cat) return res.status(404).json({ message: 'Categoria não encontrada.' })
    await prisma.category.delete({ where: { id } })
    await logBusinessEvent({
      action: 'CATEGORY_DELETED',
      actorEmail: req.auth.email,
      module: 'categories',
      entityId: id,
      payload: { categoryId: id, nome: cat.nome }
    })
    res.status(204).send()
  })
)

app.get(
  '/api/transactions',
  authRequired,
  asyncHandler(async (req, res) => {
    const mineOnly = req.query.scope !== 'all' || req.auth.role !== 'administrador'
    const statusFilter = String(req.query.status || '').trim()
    const where = mineOnly ? { userId: req.auth.id } : {}
    if (statusFilter) where.status = statusFilter
    const rows = await prisma.transaction.findMany({
      where,
      include: { user: true },
      orderBy: { id: 'desc' }
    })
    res.json({ transactions: rows.map(serializeTransaction) })
  })
)

app.delete(
  '/api/transactions/:id',
  authRequired,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    const row = await prisma.transaction.findUnique({
      where: { id },
      include: { user: true }
    })
    if (!row) return res.status(404).json({ message: 'Transação não encontrada.' })
    const canDelete =
      req.auth.role === 'administrador' || row.user.email === req.auth.email
    if (!canDelete) return res.status(403).json({ message: 'Sem permissão.' })
    await prisma.transaction.delete({ where: { id } })
    await logBusinessEvent({
      action: 'TRANSACTION_DELETED',
      actorEmail: req.auth.email,
      module: 'transactions',
      entityId: id,
      payload: { transactionId: id }
    })
    res.status(204).send()
  })
)

app.get(
  '/api/transactions/:id/workflow',
  authRequired,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    const row = await prisma.transaction.findUnique({
      where: { id },
      include: { user: true }
    })
    if (!row) return res.status(404).json({ message: 'Transação não encontrada.' })
    const canRead =
      req.auth.role === 'administrador' ||
      req.auth.role === 'financeiro' ||
      req.auth.role === 'gestor' ||
      row.user.email === req.auth.email
    if (!canRead) return res.status(403).json({ message: 'Sem permissão.' })

    const events = await prisma.workflowEvent.findMany({
      where: { transactionId: id },
      orderBy: { id: 'asc' }
    })
    res.json({ events: events.map(serializeWorkflowEvent) })
  })
)

/** Realocação de crédito entre categorias do mesmo colaborador (benefício flex interno). */
app.post(
  '/api/reallocations',
  authRequired,
  asyncHandler(async (req, res) => {
    const fromCategory = String(req.body?.fromCategory || '').trim()
    const toCategory = String(req.body?.toCategory || '').trim()
    const valor = parseMoney(req.body?.valor)
    const descricao = String(req.body?.descricao || '').trim()
    const costCenter = String(req.body?.costCenter || '*').trim() || '*'
    if (!fromCategory || !toCategory || !valor || valor <= 0) {
      return res.status(400).json({ message: 'Informe categorias de origem/destino e valor válido.' })
    }
    if (fromCategory === toCategory) {
      return res.status(400).json({ message: 'Origem e destino devem ser diferentes.' })
    }

    const user = await prisma.user.findUnique({ where: { id: req.auth.id } })
    if (!user) return res.status(401).json({ message: 'Sessão inválida.' })

    const destCat = await prisma.category.findFirst({
      where: { nome: toCategory, status: { not: 'Inativa' } }
    })
    if (!destCat) {
      return res.status(404).json({ message: 'Categoria de destino inválida ou inativa.' })
    }
    const origCat = await prisma.category.findFirst({
      where: { nome: fromCategory, status: { not: 'Inativa' } }
    })
    if (!origCat) {
      return res.status(404).json({ message: 'Categoria de origem inválida ou inativa.' })
    }

    const balFrom = await balanceInCategory(user.id, fromCategory)
    if (balFrom < valor) {
      return res.status(400).json({ message: 'Saldo insuficiente na categoria de origem.' })
    }

    await enforcePolicy({
      userId: user.id,
      role: user.role,
      category: toCategory,
      amount: valor,
      costCenter
    })

    const balTo = await balanceInCategory(user.id, toCategory)
    const teto = Number(destCat.limite)
    if (balTo + valor > teto) {
      return res.status(400).json({
        message: `Realocação excede o teto da categoria "${toCategory}" (R$ ${teto.toFixed(2)}).`
      })
    }

    const now = new Date().toLocaleDateString('pt-BR')
    const extra = descricao ? ` — ${descricao}` : ''

    const { debit, credit } = await prisma.$transaction(async (db) => {
      const debitRow = await db.transaction.create({
        data: {
          userId: user.id,
          data: now,
          tipo: 'Saída',
          categoria: fromCategory,
          valor,
          status: WORKFLOW_STATUS.CONCLUIDA,
          descricao: `Realocação para ${toCategory}${extra}`
        },
        include: { user: true }
      })
      const creditRow = await db.transaction.create({
        data: {
          userId: user.id,
          data: now,
          tipo: 'Entrada',
          categoria: toCategory,
          valor,
          status: WORKFLOW_STATUS.CONCLUIDA,
          descricao: `Realocação de ${fromCategory}${extra}`
        },
        include: { user: true }
      })
      await db.workflowEvent.createMany({
        data: [
          {
            transactionId: debitRow.id,
            fromStatus: null,
            toStatus: WORKFLOW_STATUS.CONCLUIDA,
            actorEmail: user.email,
            note: 'Realocação debitada',
            createdAt: new Date().toISOString()
          },
          {
            transactionId: creditRow.id,
            fromStatus: null,
            toStatus: WORKFLOW_STATUS.CONCLUIDA,
            actorEmail: user.email,
            note: 'Realocação creditada',
            createdAt: new Date().toISOString()
          }
        ]
      })
      return { debit: debitRow, credit: creditRow }
    })

    await logBusinessEvent({
      action: 'REALLOCATION',
      actorEmail: user.email,
      module: 'reallocation',
      entityId: debit.id,
      payload: { fromCategory, toCategory, valor, costCenter }
    })

    res.status(201).json({
      debit: serializeTransaction(debit),
      credit: serializeTransaction(credit)
    })
  })
)

/** Registro de utilização (saída) em uma categoria — sem envolver outro colaborador. */
app.post(
  '/api/usage',
  authRequired,
  asyncHandler(async (req, res) => {
    const categoria = String(req.body?.categoria || '').trim()
    const valor = parseMoney(req.body?.valor)
    const descricao = String(req.body?.descricao || '').trim()
    const costCenter = String(req.body?.costCenter || '*').trim() || '*'
    if (!categoria || !valor || valor <= 0) {
      return res.status(400).json({ message: 'Categoria e valor válidos são obrigatórios.' })
    }
    const user = await prisma.user.findUnique({ where: { id: req.auth.id } })
    if (!user) return res.status(401).json({ message: 'Sessão inválida.' })

    const cat = await prisma.category.findFirst({
      where: { nome: categoria, status: { not: 'Inativa' } }
    })
    if (!cat) return res.status(404).json({ message: 'Categoria inválida ou inativa.' })

    const bal = await balanceInCategory(user.id, categoria)
    if (bal < valor) {
      return res.status(400).json({ message: 'Saldo insuficiente nesta categoria.' })
    }

    const policyResult = await enforcePolicy({
      userId: user.id,
      role: user.role,
      category: categoria,
      amount: valor,
      costCenter
    })

    const row = await prisma.transaction.create({
      data: {
        userId: user.id,
        data: new Date().toLocaleDateString('pt-BR'),
        tipo: 'Saída',
        categoria,
        valor,
        status:
          policyResult.status === 'requires_approval'
            ? WORKFLOW_STATUS.EM_ANALISE
            : WORKFLOW_STATUS.CONCLUIDA,
        descricao: descricao || 'Utilização registrada'
      },
      include: { user: true }
    })
    await prisma.workflowEvent.create({
      data: {
        transactionId: row.id,
        fromStatus: null,
        toStatus: row.status,
        actorEmail: user.email,
        note:
          row.status === WORKFLOW_STATUS.EM_ANALISE
            ? 'Solicitação criada aguardando decisão gerencial'
            : 'Solicitação concluída automaticamente',
        createdAt: new Date().toISOString()
      }
    })

    await logBusinessEvent({
      action: 'USAGE_RECORDED',
      actorEmail: user.email,
      module: 'usage',
      entityId: row.id,
      payload: {
        categoria,
        valor,
        status: row.status,
        costCenter
      }
    })

    res.status(201).json({ transaction: serializeTransaction(row) })
  })
)

app.post(
  '/api/admin/monthly-load',
  authRequired,
  adminRequired,
  asyncHandler(async (req, res) => {
    const collaborators = await prisma.user.findMany({
      where: { role: 'colaborador', status: 'Ativo' }
    })
    const categories = await prisma.category.findMany({
      where: { status: { not: 'Inativa' } }
    })
    if (!collaborators.length || !categories.length) {
      return res.status(400).json({
        message: 'Não há colaboradores ativos ou categorias ativas para processar.'
      })
    }
    const now = new Date().toLocaleDateString('pt-BR')
    const runTag = `[run:${Date.now()}]`
    const rows = []
    for (const u of collaborators) {
      for (const c of categories) {
        const policy = await resolvePolicyRule({
          role: u.role,
          category: c.nome,
          costCenter: '*'
        })
        const baseValue = policy ? Math.min(Number(c.limite), Number(policy.monthlyCap)) : Number(c.limite)
        const v = parseMoney(baseValue)
        if (!v || v <= 0) continue
        rows.push({
          userId: u.id,
          data: now,
          tipo: 'Entrada',
          categoria: c.nome,
          valor: v,
          status: WORKFLOW_STATUS.CONCLUIDA,
          descricao: `Carga mensal — ${c.nome} ${runTag}`
        })
      }
    }
    await prisma.transaction.createMany({ data: rows })
    const insertedRows = await prisma.transaction.findMany({
      where: { descricao: { contains: runTag } },
      select: { id: true }
    })
    if (insertedRows.length) {
      await prisma.workflowEvent.createMany({
        data: insertedRows.map((row) => ({
          transactionId: row.id,
          fromStatus: null,
          toStatus: WORKFLOW_STATUS.CONCLUIDA,
          actorEmail: req.auth.email,
          note: 'Crédito criado por carga mensal',
          createdAt: new Date().toISOString()
        }))
      })
    }
    await logBusinessEvent({
      action: 'MONTHLY_LOAD',
      actorEmail: req.auth.email,
      module: 'admin_load',
      payload: { entriesCreated: rows.length }
    })
    res.status(201).json({ created: rows.length })
  })
)

const CREDIT_ELIGIBLE_ROLES = ['colaborador', 'gestor']

app.get(
  '/api/credits/eligible-users',
  authRequired,
  roleRequired(['administrador', 'financeiro']),
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      where: { status: 'Ativo', role: { in: CREDIT_ELIGIBLE_ROLES } },
      orderBy: { nome: 'asc' }
    })
    res.json({ users: users.map(publicUser) })
  })
)

app.get(
  '/api/credits/users/:userId/balances',
  authRequired,
  roleRequired(['administrador', 'financeiro']),
  asyncHandler(async (req, res) => {
    const userId = Number(req.params.userId)
    if (!userId) return res.status(400).json({ message: 'Usuário inválido.' })
    const target = await prisma.user.findUnique({ where: { id: userId } })
    if (!target || target.status !== 'Ativo' || !CREDIT_ELIGIBLE_ROLES.includes(target.role)) {
      return res.status(404).json({ message: 'Colaborador não encontrado ou inativo.' })
    }
    const categories = await prisma.category.findMany({
      where: { status: { not: 'Inativa' } },
      orderBy: { nome: 'asc' }
    })
    const balances = []
    for (const c of categories) {
      const saldo = await balanceInCategory(userId, c.nome)
      balances.push({
        categoria: c.nome,
        limite: Number(c.limite),
        saldo
      })
    }
    res.json({ user: publicUser(target), balances })
  })
)

app.post(
  '/api/credits/allocate',
  authRequired,
  roleRequired(['administrador', 'financeiro']),
  asyncHandler(async (req, res) => {
    const userId = Number(req.body?.userId)
    const items = Array.isArray(req.body?.items) ? req.body.items : []
    if (!userId) return res.status(400).json({ message: 'Selecione um colaborador.' })
    if (!items.length) {
      return res.status(400).json({ message: 'Informe ao menos uma categoria e valor.' })
    }

    const target = await prisma.user.findUnique({ where: { id: userId } })
    if (!target || target.status !== 'Ativo' || !CREDIT_ELIGIBLE_ROLES.includes(target.role)) {
      return res.status(404).json({ message: 'Colaborador não encontrado ou inativo.' })
    }

    const activeCategories = await prisma.category.findMany({
      where: { status: { not: 'Inativa' } }
    })
    const categoryNames = new Set(activeCategories.map((c) => c.nome))
    const now = new Date().toLocaleDateString('pt-BR')
    const created = []

    for (const raw of items) {
      const categoria = String(raw?.categoria || '').trim()
      const valor = parseMoney(raw?.valor)
      const descricao =
        String(raw?.descricao || '').trim() || `Alocação manual — ${categoria}`
      if (!categoria || !categoryNames.has(categoria)) {
        return res.status(400).json({
          message: `Categoria inválida: ${categoria || '(vazia)'}`
        })
      }
      if (!valor || valor <= 0) continue

      const row = await prisma.transaction.create({
        data: {
          userId,
          data: now,
          tipo: 'Entrada',
          categoria,
          valor,
          status: WORKFLOW_STATUS.CONCLUIDA,
          descricao
        },
        include: { user: true }
      })
      await prisma.workflowEvent.create({
        data: {
          transactionId: row.id,
          fromStatus: null,
          toStatus: WORKFLOW_STATUS.CONCLUIDA,
          actorEmail: req.auth.email,
          note: 'Crédito alocado por RH/Financeiro',
          createdAt: new Date().toISOString()
        }
      })
      created.push(serializeTransaction(row))
    }

    if (!created.length) {
      return res.status(400).json({ message: 'Nenhum valor válido informado.' })
    }

    await logBusinessEvent({
      action: 'CREDIT_ALLOCATED',
      actorEmail: req.auth.email,
      module: 'credit_allocation',
      entityId: userId,
      payload: { entriesCreated: created.length, targetEmail: target.email }
    })

    res.status(201).json({ created: created.length, transactions: created })
  })
)

app.get(
  '/api/admin/audit',
  authRequired,
  adminRequired,
  asyncHandler(async (_req, res) => {
    const events = await fetchRecentAudit(100)
    res.json({
      events,
      provider: getAuditProvider(),
      ready: isAuditReady(),
      firestoreEnabled: isFirestoreReady(),
      credentialConfigured: isFirebaseCredentialEnvSet() || isMongoCredentialEnvSet(),
      firebaseInitError: getFirestoreInitError()?.message || null
    })
  })
)

app.get(
  '/api/manager/approvals',
  authRequired,
  roleRequired(['gestor', 'administrador']),
  asyncHandler(async (req, res) => {
    const rawStatus = String(req.query.status || '').trim().toLowerCase()
    const mapStatus = {
      em_analise: WORKFLOW_STATUS.EM_ANALISE,
      aprovado: WORKFLOW_STATUS.APROVADO,
      reprovado: WORKFLOW_STATUS.REPROVADO,
      liquidado: WORKFLOW_STATUS.LIQUIDADO
    }
    const selected = mapStatus[rawStatus]
    const rows = await prisma.transaction.findMany({
      where: selected
        ? { status: selected, tipo: 'Saída' }
        : { status: { in: [WORKFLOW_STATUS.PENDENTE, WORKFLOW_STATUS.EM_ANALISE, WORKFLOW_STATUS.APROVADO, WORKFLOW_STATUS.REPROVADO, WORKFLOW_STATUS.LIQUIDADO] }, tipo: 'Saída' },
      include: { user: true },
      orderBy: { id: 'desc' }
    })
    const approvals = rows.map((row) => ({
      id: row.id,
      requesterName: row.user.nome,
      requesterEmail: row.user.email,
      category: row.categoria,
      amount: Number(row.valor),
      status: row.status.toLowerCase().replaceAll(' ', '_'),
      requestedAt: row.data,
      description: row.descricao || ''
    }))
    res.json({ approvals })
  })
)

app.get(
  '/api/manager/sla-summary',
  authRequired,
  roleRequired(['gestor', 'administrador']),
  asyncHandler(async (req, res) => {
    const thresholdDays = Math.max(1, Number(req.query.thresholdDays || 7))
    const rows = await prisma.transaction.findMany({
      where: { tipo: 'Saída' },
      include: { user: true },
      orderBy: { id: 'desc' }
    })
    const kpis = {
      totalRequests: rows.length,
      inAnalysis: 0,
      approved: 0,
      rejected: 0,
      settled: 0
    }
    const staleApprovals = []

    for (const row of rows) {
      if (row.status === WORKFLOW_STATUS.EM_ANALISE || row.status === WORKFLOW_STATUS.PENDENTE) kpis.inAnalysis += 1
      if (row.status === WORKFLOW_STATUS.APROVADO) kpis.approved += 1
      if (row.status === WORKFLOW_STATUS.REPROVADO) kpis.rejected += 1
      if (row.status === WORKFLOW_STATUS.LIQUIDADO) kpis.settled += 1

      if (row.status === WORKFLOW_STATUS.EM_ANALISE || row.status === WORKFLOW_STATUS.PENDENTE) {
        const refDate = parsePtBrDate(row.data)
        const ageDays = daysBetween(refDate)
        if (ageDays >= thresholdDays) {
          staleApprovals.push({
            id: row.id,
            requesterName: row.user.nome,
            requesterEmail: row.user.email,
            category: row.categoria,
            amount: Number(row.valor),
            status: row.status,
            requestedAt: row.data,
            ageDays
          })
        }
      }
    }

    const approvalEvents = await prisma.workflowEvent.findMany({
      where: { toStatus: WORKFLOW_STATUS.APROVADO },
      orderBy: { id: 'asc' }
    })
    let sumHours = 0
    let count = 0
    for (const event of approvalEvents) {
      const initial = await prisma.workflowEvent.findFirst({
        where: {
          transactionId: event.transactionId,
          toStatus: { in: [WORKFLOW_STATUS.EM_ANALISE, WORKFLOW_STATUS.PENDENTE] }
        },
        orderBy: { id: 'asc' }
      })
      if (!initial) continue
      const start = new Date(initial.createdAt)
      const end = new Date(event.createdAt)
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
      if (hours >= 0) {
        sumHours += hours
        count += 1
      }
    }

    res.json({
      kpis: {
        ...kpis,
        avgApprovalHours: count ? Number((sumHours / count).toFixed(2)) : 0
      },
      thresholdDays,
      staleApprovals: staleApprovals.sort((a, b) => b.ageDays - a.ageDays)
    })
  })
)

app.post(
  '/api/manager/approvals/:id/decision',
  authRequired,
  roleRequired(['gestor', 'administrador']),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    const decision = String(req.body?.decision || '').trim().toLowerCase()
    const justification = String(req.body?.justification || '').trim()
    if (!['aprovado', 'reprovado'].includes(decision)) {
      return res.status(400).json({ message: 'Decisão inválida.' })
    }
    const tx = await prisma.transaction.findUnique({ where: { id }, include: { user: true } })
    if (!tx) return res.status(404).json({ message: 'Solicitação não encontrada.' })
    if (![WORKFLOW_STATUS.EM_ANALISE, WORKFLOW_STATUS.PENDENTE].includes(tx.status)) {
      return res.status(400).json({ message: 'Somente solicitações em análise podem receber decisão.' })
    }

    const status = decision === 'aprovado' ? WORKFLOW_STATUS.APROVADO : WORKFLOW_STATUS.REPROVADO
    await transitionStatus({
      transactionId: id,
      toStatus: status,
      actorEmail: req.auth.email,
      note: `Decisão gerencial: ${decision}${justification ? ` (${justification})` : ''}`
    })
    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        descricao: `${tx.descricao || 'Solicitação'} — decisão gestor: ${decision}${justification ? ` (${justification})` : ''}`
      },
      include: { user: true }
    })
    await logBusinessEvent({
      action: 'MANAGER_DECISION',
      actorEmail: req.auth.email,
      module: 'approvals',
      entityId: id,
      payload: { transactionId: id, decision }
    })
    res.json({ approval: serializeTransaction(updated) })
  })
)

app.get(
  '/api/rh/policies/summary',
  authRequired,
  roleRequired(['administrador']),
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({ orderBy: { id: 'asc' } })
    const policyRules = await prisma.policyRule.findMany({
      where: { active: true },
      orderBy: { id: 'asc' }
    })
    const collaborators = await prisma.user.findMany({
      where: { role: 'colaborador', status: 'Ativo' }
    })
    const activeCategories = categories.filter((c) => c.status !== 'Inativa')
    const monthlyBudget = activeCategories.reduce(
      (sum, c) => sum + Number(c.limite) * collaborators.length,
      0
    )
    const policies = policyRules.map((p) => ({
      id: p.id,
      category: p.category,
      role: p.role,
      limit: Number(p.monthlyCap),
      maxPerTransaction: Number(p.maxPerTransaction),
      requiresApproval: p.requiresApproval,
      costCenter: p.costCenter,
      validity: '2026',
      status: p.active ? 'Ativa' : 'Inativa'
    }))

    res.json({
      summary: {
        activeCategories: activeCategories.length,
        monthlyBudget,
        eligibleEmployees: collaborators.length
      },
      policies
    })
  })
)

app.get(
  '/api/executive/overview',
  authRequired,
  roleRequired(['administrador', 'financeiro']),
  asyncHandler(async (req, res) => {
    const { month, year } = parseMonthYearQuery(req.query)
    const collaborators = await prisma.user.findMany({
      where: { role: 'colaborador', status: 'Ativo' }
    })
    const categories = await prisma.category.findMany({
      where: { status: { not: 'Inativa' } },
      orderBy: { id: 'asc' }
    })
    const policies = await prisma.policyRule.findMany({
      where: { active: true },
      orderBy: { id: 'asc' }
    })
    const realizedRows = await prisma.transaction.findMany({
      where: {
        tipo: 'Saída',
        status: { in: [WORKFLOW_STATUS.CONCLUIDA, WORKFLOW_STATUS.APROVADO, WORKFLOW_STATUS.LIQUIDADO] }
      }
    })
    const realizedInPeriod = realizedRows.filter((r) => dateMatchesMonthYear(r.data, month, year))

    const eligibleCount = collaborators.length
    const costCenterByCategory = new Map()
    for (const p of policies) {
      if (!costCenterByCategory.has(p.category)) {
        costCenterByCategory.set(p.category, p.costCenter || 'Não definido')
      }
    }

    const realizedByCategory = new Map()
    for (const row of realizedInPeriod) {
      realizedByCategory.set(row.categoria, (realizedByCategory.get(row.categoria) || 0) + Number(row.valor))
    }

    const categoryDeviation = categories.map((c) => {
      const predicted = Number(c.limite) * eligibleCount
      const realized = realizedByCategory.get(c.nome) || 0
      return {
        category: c.nome,
        costCenter: costCenterByCategory.get(c.nome) || 'Não definido',
        predicted,
        realized,
        deviation: realized - predicted,
        usagePercent: predicted > 0 ? Number(((realized / predicted) * 100).toFixed(2)) : 0
      }
    })

    const centerAgg = new Map()
    for (const row of categoryDeviation) {
      const key = row.costCenter
      const current = centerAgg.get(key) || {
        costCenter: key,
        predicted: 0,
        realized: 0,
        categories: 0
      }
      current.predicted += row.predicted
      current.realized += row.realized
      current.categories += 1
      centerAgg.set(key, current)
    }
    const costCenterRiskRanking = Array.from(centerAgg.values())
      .map((x) => ({
        ...x,
        deviation: x.realized - x.predicted,
        usagePercent: x.predicted > 0 ? Number(((x.realized / x.predicted) * 100).toFixed(2)) : 0
      }))
      .sort((a, b) => b.usagePercent - a.usagePercent)

    const predictedTotal = categoryDeviation.reduce((sum, x) => sum + x.predicted, 0)
    const realizedTotal = categoryDeviation.reduce((sum, x) => sum + x.realized, 0)

    res.json({
      period: { month, year },
      overview: {
        eligibleEmployees: eligibleCount,
        predictedTotal,
        realizedTotal,
        totalDeviation: realizedTotal - predictedTotal,
        usagePercent: predictedTotal > 0 ? Number(((realizedTotal / predictedTotal) * 100).toFixed(2)) : 0
      },
      categoryDeviation,
      costCenterRiskRanking
    })
  })
)

app.get(
  '/api/executive/cost-center-details',
  authRequired,
  roleRequired(['administrador', 'financeiro']),
  asyncHandler(async (req, res) => {
    const { month, year } = parseMonthYearQuery(req.query)
    const costCenter = String(req.query.costCenter || '').trim()
    if (!costCenter) {
      return res.status(400).json({ message: 'Informe o centro de custo.' })
    }

    const collaborators = await prisma.user.findMany({
      where: { role: 'colaborador', status: 'Ativo' }
    })
    const categories = await prisma.category.findMany({
      where: { status: { not: 'Inativa' } },
      orderBy: { id: 'asc' }
    })
    const policies = await prisma.policyRule.findMany({
      where: { active: true },
      orderBy: { id: 'asc' }
    })

    const selectedPolicies = policies.filter((p) => (p.costCenter || 'Não definido') === costCenter)
    const selectedCategories = new Set(selectedPolicies.map((p) => p.category))
    if (!selectedCategories.size) {
      return res.json({
        costCenter,
        period: { month, year },
        summary: { predicted: 0, realized: 0, deviation: 0, usagePercent: 0 },
        categories: [],
        requests: []
      })
    }

    const realizedRows = await prisma.transaction.findMany({
      where: {
        tipo: 'Saída',
        categoria: { in: Array.from(selectedCategories) },
        status: { in: [WORKFLOW_STATUS.CONCLUIDA, WORKFLOW_STATUS.APROVADO, WORKFLOW_STATUS.LIQUIDADO, WORKFLOW_STATUS.EM_ANALISE, WORKFLOW_STATUS.PENDENTE] }
      },
      include: { user: true },
      orderBy: { id: 'desc' }
    })
    const realizedInPeriod = realizedRows.filter((r) => dateMatchesMonthYear(r.data, month, year))

    const eligibleCount = collaborators.length
    const byCategory = categories
      .filter((c) => selectedCategories.has(c.nome))
      .map((c) => {
        const predicted = Number(c.limite) * eligibleCount
        const realized = realizedInPeriod
          .filter((r) => r.categoria === c.nome && [WORKFLOW_STATUS.CONCLUIDA, WORKFLOW_STATUS.APROVADO, WORKFLOW_STATUS.LIQUIDADO].includes(r.status))
          .reduce((sum, r) => sum + Number(r.valor), 0)
        return {
          category: c.nome,
          predicted,
          realized,
          deviation: realized - predicted,
          usagePercent: predicted > 0 ? Number(((realized / predicted) * 100).toFixed(2)) : 0
        }
      })

    const predicted = byCategory.reduce((sum, x) => sum + x.predicted, 0)
    const realized = byCategory.reduce((sum, x) => sum + x.realized, 0)
    const requests = realizedInPeriod.slice(0, 30).map((r) => ({
      id: r.id,
      requesterName: r.user.nome,
      requesterEmail: r.user.email,
      category: r.categoria,
      amount: Number(r.valor),
      status: r.status,
      requestedAt: r.data,
      description: r.descricao || ''
    }))

    res.json({
      costCenter,
      period: { month, year },
      summary: {
        predicted,
        realized,
        deviation: realized - predicted,
        usagePercent: predicted > 0 ? Number(((realized / predicted) * 100).toFixed(2)) : 0
      },
      categories: byCategory.sort((a, b) => b.usagePercent - a.usagePercent),
      requests
    })
  })
)

app.get(
  '/api/finance/closing/summary',
  authRequired,
  roleRequired(['financeiro', 'administrador']),
  asyncHandler(async (req, res) => {
    const { month, year } = parseMonthYearQuery(req.query)
    const approved = await prisma.transaction.findMany({
      where: { status: { in: [WORKFLOW_STATUS.CONCLUIDA, WORKFLOW_STATUS.APROVADO, WORKFLOW_STATUS.LIQUIDADO] } }
    })
    const approvedInPeriod = approved.filter((row) => dateMatchesMonthYear(row.data, month, year))
    const pending = await prisma.transaction.count({
      where: { status: { in: [WORKFLOW_STATUS.PENDENTE, WORKFLOW_STATUS.EM_ANALISE] } }
    })
    const byCategory = new Map()
    for (const row of approvedInPeriod) {
      const key = row.categoria
      const current = byCategory.get(key) || { category: key, total: 0, count: 0 }
      current.total += Number(row.valor)
      current.count += 1
      byCategory.set(key, current)
    }
    const lines = Array.from(byCategory.values()).sort((a, b) => b.total - a.total)
    const approvedTotal = lines.reduce((sum, l) => sum + l.total, 0)

    res.json({
      summary: {
        referenceMonth: `${String(month).padStart(2, '0')}/${year}`,
        approvedTotal,
        pendingCount: pending
      },
      lines
    })
  })
)

app.post(
  '/api/finance/closing/run',
  authRequired,
  roleRequired(['financeiro', 'administrador']),
  asyncHandler(async (req, res) => {
    const settledCandidates = await prisma.transaction.findMany({
      where: {
        status: {
          in: [WORKFLOW_STATUS.APROVADO, WORKFLOW_STATUS.CONCLUIDA]
        }
      }
    })
    for (const row of settledCandidates) {
      await transitionStatus({
        transactionId: row.id,
        toStatus: WORKFLOW_STATUS.LIQUIDADO,
        actorEmail: req.auth.email,
        note: 'Liquidação em fechamento financeiro mensal'
      })
    }
    const referenceMonth = new Date().toLocaleDateString('pt-BR', {
      month: '2-digit',
      year: 'numeric'
    })
    await logBusinessEvent({
      action: 'FINANCE_CLOSING',
      actorEmail: req.auth.email,
      module: 'closing',
      entityId: null,
      payload: { referenceMonth, settledItems: settledCandidates.length }
    })
    res.json({ ok: true, referenceMonth, settledItems: settledCandidates.length })
  })
)

app.get(
  '/api/finance/closing/export.csv',
  authRequired,
  roleRequired(['financeiro', 'administrador']),
  asyncHandler(async (_req, res) => {
    const rows = await prisma.transaction.findMany({
      where: { status: { in: [WORKFLOW_STATUS.CONCLUIDA, WORKFLOW_STATUS.APROVADO, WORKFLOW_STATUS.LIQUIDADO] } },
      include: { user: true },
      orderBy: { id: 'asc' }
    })
    const lines = [
      'id,data,usuario_email,categoria,tipo,valor,status,descricao',
      ...rows.map((r) =>
        [
          r.id,
          r.data,
          r.user.email,
          r.categoria,
          r.tipo,
          Number(r.valor).toFixed(2),
          r.status,
          `"${String(r.descricao || '').replaceAll('"', '""')}"`
        ].join(',')
      )
    ]
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="fechamento-financeiro.csv"')
    res.send(lines.join('\n'))
  })
)

app.use((err, _req, res, _next) => {
  console.error(err)
  if (err.code === 'P2002') {
    return res.status(409).json({ message: 'Registro duplicado.' })
  }
  res.status(500).json({ message: 'Erro interno no servidor.' })
})

const server = app.listen(PORT, () => {
  console.log(`API FlexBen na porta ${PORT} (${NODE_ENV})`)
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `[erro] Porta ${PORT} já está em uso. Encerre o outro backend (ex.: kill $(lsof -t -i:${PORT})) ou altere PORT no .env.`
    )
    process.exit(1)
  }
  throw err
})
