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
import {
  applyApprovedCeilingProposal,
  requiresSuperiorApproval,
  serializeCeilingProposal
} from './lib/ceilingProposals.js'
import { authRequired, adminRequired, roleRequired } from './middleware/auth.js'
import { registerCreditRoutes } from './routes/credits.routes.js'
import { syncNotificationsForUser, serializeNotification } from './lib/notifications.js'
import { publishNotificationEvent } from './lib/notificationPublisher.js'
import { NOTIFICATION_EVENTS } from './lib/notificationEvents.js'
import { handleNotificationEvent } from './lib/notificationHandlers.js'
import { createMessageBroker, isRabbitMqEnabled } from './adapters/messaging/createMessageBroker.js'
import {
  API_JSON_BODY_LIMIT,
  validateAvatarBase64
} from './lib/avatarLimits.js'
import {
  buildClosingExport,
  buildClosingCsv,
  parseMonthYearQuery as parseClosingMonthYear
} from './lib/closingExport.js'
import { verifyGoogleCredential, isGoogleAuthConfigured } from './lib/googleAuth.js'

const PORT = Number(process.env.PORT || 3333)
const JWT_SECRET = process.env.JWT_SECRET || 'flexben-dev-secret'
const NODE_ENV = process.env.NODE_ENV || 'development'
const FRONTEND_URLS = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const app = express()
app.set('etag', false)
app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  next()
})
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true)
      if (NODE_ENV !== 'production') return callback(null, true)
      if (FRONTEND_URLS.length === 0) return callback(null, true)
      if (FRONTEND_URLS.includes(origin)) return callback(null, true)
      try {
        const host = new URL(origin).hostname
        if (host.endsWith('.vercel.app') || host.endsWith('.onrender.com')) {
          return callback(null, true)
        }
      } catch {
        /* ignore invalid origin */
      }
      return callback(null, false)
    },
    credentials: true
  })
)
app.use(express.json({ limit: API_JSON_BODY_LIMIT }))
app.use(express.urlencoded({ extended: true, limit: API_JSON_BODY_LIMIT }))
app.use(morgan('dev'))

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
}

function publicUser(user, options = {}) {
  const { includeAvatar = false } = options
  const base = {
    id: user.id,
    nome: user.nome,
    email: user.email,
    role: user.role,
    status: user.status,
    dataCadastro: user.dataCadastro,
    authProvider: user.authProvider || 'password',
    hasAvatar: Boolean(user.avatarData),
    initials: user.nome
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  if (includeAvatar && user.avatarData) {
    base.avatarData = user.avatarData
  }
  return base
}

async function creditAmountForUserCategory(user, category) {
  const policy = await resolvePolicyRule({
    role: user.role,
    category: category.nome,
    costCenter: '*'
  })
  const baseValue = policy
    ? Math.min(Number(category.limite), Number(policy.monthlyCap))
    : Number(category.limite)
  return parseMoney(baseValue) || 0
}

async function buildMonthlyLoadPreview() {
  const collaborators = await prisma.user.findMany({
    where: { role: 'colaborador', status: 'Ativo' }
  })
  const categories = await prisma.category.findMany({
    where: { status: { not: 'Inativa' } }
  })

  let entriesCount = 0
  let totalAmount = 0
  const categoryRows = []

  for (const c of categories) {
    let categoryTotal = 0
    let perCollaborator = 0
    let creditedUsers = 0

    for (const u of collaborators) {
      const v = await creditAmountForUserCategory(u, c)
      if (v <= 0) continue
      if (!perCollaborator) perCollaborator = v
      categoryTotal += v
      creditedUsers += 1
      entriesCount += 1
      totalAmount += v
    }

    categoryRows.push({
      nome: c.nome,
      limite: Number(c.limite),
      perCollaborator,
      collaborators: creditedUsers,
      categoryTotal
    })
  }

  return {
    collaborators: collaborators.length,
    categories: categories.length,
    entriesCount,
    totalAmount,
    categoryRows
  }
}

function serializeTransaction(row) {
  return {
    id: row.id,
    userEmail: String(row.user.email || '').toLowerCase(),
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

const FINANCE_OPS_ROLES = ['financeiro', 'gestor', 'administrador']
const REALLOC_FOR_OTHERS_ROLES = ['financeiro', 'gestor', 'administrador']
const CREDIT_ELIGIBLE_ROLES = ['colaborador', 'gestor']
const CEILING_APPROVER_ROLES = ['gestor', 'administrador']

async function transitionCeilingProposal({ proposalId, toStatus, actorEmail, note = '' }) {
  const current = await prisma.benefitCeilingProposal.findUnique({ where: { id: proposalId } })
  if (!current) {
    const err = new Error('Proposta de teto não encontrada.')
    err.statusCode = 404
    throw err
  }
  const updated = await prisma.benefitCeilingProposal.update({
    where: { id: proposalId },
    data: { status: toStatus }
  })
  await prisma.ceilingProposalEvent.create({
    data: {
      proposalId,
      fromStatus: current.status,
      toStatus,
      actorEmail,
      note: note || null,
      createdAt: new Date().toISOString()
    }
  })
  return updated
}

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
      messaging: {
        provider: isRabbitMqEnabled() ? 'rabbitmq' : 'inline',
        queue: 'flexben.notifications'
      },
      googleAuth: isGoogleAuthConfigured(),
      features: [
        'auth',
        'transactions',
        'credits',
        'ceiling-proposals',
        'monthly-load',
        'manager-approvals',
        'finance-closing'
      ],
      apiVersion: '2.1-credits',
      timestamp: new Date().toISOString()
    })
  })
)

registerCreditRoutes(app, {
  authRequired,
  roleRequired,
  asyncHandler,
  publicUser,
  serializeTransaction,
  parseMoney,
  balanceInCategory,
  WORKFLOW_STATUS,
  FINANCE_OPS_ROLES
})

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
    if ((user.authProvider || 'password') === 'google') {
      return res.status(403).json({ message: 'Esta conta usa login com Google.' })
    }
    if (!user.passwordHash) {
      return res.status(403).json({ message: 'Conta sem senha configurada. Procure o RH.' })
    }
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
  '/api/auth/google',
  asyncHandler(async (req, res) => {
    const credential = String(req.body?.credential || '')
    if (!credential) {
      return res.status(400).json({ message: 'Token Google ausente.' })
    }
    let googleUser
    try {
      googleUser = await verifyGoogleCredential(credential)
    } catch (err) {
      return res.status(401).json({
        message: err.message || 'Não foi possível validar o login com Google.'
      })
    }
    const user = await prisma.user.findUnique({ where: { email: googleUser.email } })
    if (!user) {
      return res.status(403).json({
        message: 'E-mail não cadastrado. Solicite acesso ao RH ou administrador.'
      })
    }
    if ((user.authProvider || 'password') !== 'google') {
      return res.status(403).json({ message: 'Esta conta usa e-mail e senha.' })
    }
    if (user.status !== 'Ativo') {
      return res.status(403).json({ message: 'Conta inativa. Procure o RH.' })
    }
    if (googleUser.sub) {
      if (user.googleSub && user.googleSub !== googleUser.sub) {
        return res.status(403).json({ message: 'Conta Google não confere com o cadastro.' })
      }
      if (!user.googleSub) {
        await prisma.user.update({
          where: { id: user.id },
          data: { googleSub: googleUser.sub }
        })
        user.googleSub = googleUser.sub
      }
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '12h' }
    )
    await logBusinessEvent({
      action: 'LOGIN_GOOGLE',
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
  asyncHandler(async (_req, res) => {
    res.status(403).json({
      message:
        'Cadastro público desativado. Solicite acesso ao RH ou administrador da empresa.'
    })
  })
)

app.get(
  '/api/auth/me',
  authRequired,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.auth.id } })
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' })
    res.json({ user: publicUser(user, { includeAvatar: true }) })
  })
)

app.patch(
  '/api/auth/profile',
  authRequired,
  asyncHandler(async (req, res) => {
    const nome = String(req.body?.nome || '').trim()
    const avatarData = req.body?.avatarData != null ? String(req.body.avatarData) : undefined
    const data = {}
    if (nome.length >= 2) data.nome = nome
    if (avatarData !== undefined) {
      const avatarError = validateAvatarBase64(avatarData)
      if (avatarError) {
        return res.status(400).json({ message: avatarError })
      }
      data.avatarData = avatarData ? String(avatarData).trim() : null
    }
    if (!Object.keys(data).length) {
      return res.status(400).json({ message: 'Nenhum dado para atualizar.' })
    }
    const updated = await prisma.user.update({
      where: { id: req.auth.id },
      data
    })
    res.json({ user: publicUser(updated, { includeAvatar: true }) })
  })
)

app.patch(
  '/api/auth/password',
  authRequired,
  asyncHandler(async (req, res) => {
    const currentPassword = String(req.body?.currentPassword || '')
    const newPassword = String(req.body?.newPassword || '')
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Informe a senha atual e a nova senha.' })
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'A nova senha deve ter ao menos 6 caracteres.' })
    }
    const user = await prisma.user.findUnique({ where: { id: req.auth.id } })
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' })
    if ((user.authProvider || 'password') === 'google' || !user.passwordHash) {
      return res.status(403).json({ message: 'Contas Google não alteram senha aqui.' })
    }
    const ok = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!ok) return res.status(401).json({ message: 'Senha atual incorreta.' })
    const passwordHash = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } })
    res.json({ ok: true, message: 'Senha atualizada com sucesso.' })
  })
)

app.get(
  '/api/notifications',
  authRequired,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.auth.id } })
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' })
    await syncNotificationsForUser(user)
    const rows = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { id: 'desc' },
      take: 50
    })
    const unreadCount = rows.filter((n) => !n.read).length
    res.json({
      notifications: rows.map(serializeNotification),
      unreadCount
    })
  })
)

app.patch(
  '/api/notifications/read-all',
  authRequired,
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({
      where: { userId: req.auth.id, read: false },
      data: { read: true }
    })
    res.json({ ok: true })
  })
)

app.patch(
  '/api/notifications/:id/read',
  authRequired,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    const row = await prisma.notification.findFirst({
      where: { id, userId: req.auth.id }
    })
    if (!row) return res.status(404).json({ message: 'Notificação não encontrada.' })
    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true }
    })
    res.json({ notification: serializeNotification(updated) })
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
    const authProvider = String(req.body?.authProvider || 'password').trim().toLowerCase()
    const role = String(req.body?.role || 'colaborador').trim().toLowerCase()
    const allowedRoles = ['colaborador', 'gestor', 'administrador', 'financeiro']
    const allowedProviders = ['password', 'google']
    if (nome.length < 2) return res.status(400).json({ message: 'Nome inválido.' })
    if (!email.includes('@')) return res.status(400).json({ message: 'E-mail inválido.' })
    if (!allowedProviders.includes(authProvider)) {
      return res.status(400).json({ message: 'Tipo de autenticação inválido.' })
    }
    if (authProvider === 'password' && senha.length < 6) {
      return res.status(400).json({ message: 'Senha deve ter ao menos 6 caracteres.' })
    }
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: 'Perfil inválido.' })
    }
    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) return res.status(409).json({ message: 'Este e-mail já está cadastrado.' })
    const passwordHash =
      authProvider === 'password' ? await bcrypt.hash(senha, 10) : null
    const user = await prisma.user.create({
      data: {
        nome,
        email,
        authProvider,
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
      payload: { userId: user.id, role, authProvider }
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

    let balances = []
    if (mineOnly) {
      const activeCategories = await prisma.category.findMany({
        where: { status: { not: 'Inativa' } },
        orderBy: { nome: 'asc' }
      })
      balances = await Promise.all(
        activeCategories.map(async (c) => ({
          categoria: c.nome,
          limite: Number(c.limite),
          saldo: await balanceInCategory(req.auth.id, c.nome)
        }))
      )
    }

    res.json({
      transactions: rows.map(serializeTransaction),
      balances
    })
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

    let targetUserId = req.auth.id
    const requestedUserId = Number(req.body?.userId)
    if (requestedUserId && requestedUserId !== req.auth.id) {
      if (!REALLOC_FOR_OTHERS_ROLES.includes(req.auth.role)) {
        return res.status(403).json({ message: 'Sem permissão para realocar em nome de outro colaborador.' })
      }
      targetUserId = requestedUserId
    }

    const user = await prisma.user.findUnique({ where: { id: targetUserId } })
    if (!user) return res.status(404).json({ message: 'Colaborador não encontrado.' })
    if (user.status !== 'Ativo' || !CREDIT_ELIGIBLE_ROLES.includes(user.role)) {
      return res.status(400).json({ message: 'Colaborador inativo ou não elegível para realocação.' })
    }

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
      return res.status(400).json({
        message: `Saldo insuficiente na categoria de origem. Disponível: R$ ${balFrom.toFixed(2)}.`
      })
    }

    const now = new Date().toLocaleDateString('pt-BR')
    const extra = descricao ? ` — ${descricao}` : ''

    // Operações do financeiro sempre exigem aprovação do gestor
    const needsManagerApproval = req.auth.role === 'financeiro'
    const txStatus = needsManagerApproval ? WORKFLOW_STATUS.EM_ANALISE : WORKFLOW_STATUS.CONCLUIDA
    const wfNote = needsManagerApproval
      ? 'Realocação criada pelo financeiro — aguardando aprovação do gestor'
      : null

    const { debit, credit } = await prisma.$transaction(async (db) => {
      const debitRow = await db.transaction.create({
        data: {
          userId: user.id,
          data: now,
          tipo: 'Saída',
          categoria: fromCategory,
          valor,
          status: txStatus,
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
          status: txStatus,
          descricao: `Realocação de ${fromCategory}${extra}`
        },
        include: { user: true }
      })
      await db.workflowEvent.createMany({
        data: [
          {
            transactionId: debitRow.id,
            fromStatus: null,
            toStatus: txStatus,
            actorEmail: req.auth.email,
            note: wfNote || 'Realocação debitada',
            createdAt: new Date().toISOString()
          },
          {
            transactionId: creditRow.id,
            fromStatus: null,
            toStatus: txStatus,
            actorEmail: req.auth.email,
            note: wfNote || 'Realocação creditada',
            createdAt: new Date().toISOString()
          }
        ]
      })
      return { debit: debitRow, credit: creditRow }
    })

    await logBusinessEvent({
      action: 'REALLOCATION',
      actorEmail: req.auth.email,
      module: 'reallocation',
      entityId: debit.id,
      payload: {
        fromCategory,
        toCategory,
        valor,
        costCenter,
        targetUserId: user.id,
        targetEmail: user.email
      }
    })

    if (needsManagerApproval) {
      await publishNotificationEvent({
        type: NOTIFICATION_EVENTS.APPROVAL_SUBMITTED,
        payload: {
          transactionId: debit.id,
          actorEmail: req.auth.email,
          beneficiaryName: user.nome,
          operationType: 'realocacao',
          category: `${fromCategory} → ${toCategory}`,
          amount: valor,
          description: descricao || `Realocação para ${toCategory}`
        }
      })
    }

    res.status(201).json({
      debit: serializeTransaction(debit),
      credit: serializeTransaction(credit),
      needsApproval: needsManagerApproval
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
    if (valor > bal + 0.001) {
      return res.status(400).json({
        message: `Saldo insuficiente. Disponível na categoria: R$ ${bal.toFixed(2)}.`
      })
    }

    let policyResult = { status: 'no_rule' }
    try {
      policyResult = await enforcePolicy({
      userId: user.id,
      role: user.role,
      category: categoria,
      amount: valor,
      costCenter
      })
    } catch (policyErr) {
      return res.status(400).json({ message: policyErr.message || 'Política não permite este valor.' })
    }

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

    if (row.status === WORKFLOW_STATUS.EM_ANALISE) {
      await publishNotificationEvent({
        type: NOTIFICATION_EVENTS.USAGE_SUBMITTED,
        payload: {
          transactionId: row.id,
          userId: user.id,
          category: categoria,
          amount: valor
        }
      })
    }

    res.status(201).json({ transaction: serializeTransaction(row) })
  })
)

app.get(
  '/api/admin/monthly-load/preview',
  authRequired,
  adminRequired,
  asyncHandler(async (_req, res) => {
    const preview = await buildMonthlyLoadPreview()
    res.json(preview)
  })
)

app.post(
  '/api/admin/monthly-load',
  authRequired,
  adminRequired,
  asyncHandler(async (req, res) => {
    const preview = await buildMonthlyLoadPreview()
    if (!preview.collaborators || !preview.categories) {
      return res.status(400).json({
        message: 'Não há colaboradores ativos ou categorias ativas para processar.'
      })
    }
    const collaborators = await prisma.user.findMany({
      where: { role: 'colaborador', status: 'Ativo' }
    })
    const categories = await prisma.category.findMany({
      where: { status: { not: 'Inativa' } }
    })
    const now = new Date().toLocaleDateString('pt-BR')
    const runTag = `[run:${Date.now()}]`
    const rows = []
    for (const u of collaborators) {
      for (const c of categories) {
        const v = await creditAmountForUserCategory(u, c)
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

app.get(
  '/api/ceiling-proposals',
  authRequired,
  roleRequired(FINANCE_OPS_ROLES),
  asyncHandler(async (req, res) => {
    const rawStatus = String(req.query.status || '').trim().toLowerCase()
    const mapStatus = {
      em_analise: WORKFLOW_STATUS.EM_ANALISE,
      aprovado: WORKFLOW_STATUS.APROVADO,
      reprovado: WORKFLOW_STATUS.REPROVADO,
      concluida: WORKFLOW_STATUS.CONCLUIDA,
      pendente: WORKFLOW_STATUS.PENDENTE
    }
    const selected = mapStatus[rawStatus]
    const pendingOnly = String(req.query.pendingApproval || '') === '1'

    let where = selected ? { status: selected } : {}
    if (pendingOnly) {
      where = { status: { in: [WORKFLOW_STATUS.PENDENTE, WORKFLOW_STATUS.EM_ANALISE] } }
    }

    const rows = await prisma.benefitCeilingProposal.findMany({
      where,
      orderBy: { id: 'desc' }
    })
    res.json({ proposals: rows.map(serializeCeilingProposal) })
  })
)

app.post(
  '/api/ceiling-proposals',
  authRequired,
  roleRequired(FINANCE_OPS_ROLES),
  asyncHandler(async (req, res) => {
    const requestType = String(req.body?.requestType || '').trim().toLowerCase()
    const categoryName = String(req.body?.categoryName || '').trim()
    const categoryId = req.body?.categoryId != null ? Number(req.body.categoryId) : null
    const proposedMonthlyCap = parseMoney(req.body?.proposedMonthlyCap)
    const proposedMaxPerTx = parseMoney(req.body?.proposedMaxPerTx)
    const justification = String(req.body?.justification || '').trim()
    const employeeRole = String(req.body?.employeeRole || 'colaborador').trim()

    if (!['create', 'increase', 'decrease'].includes(requestType)) {
      return res.status(400).json({ message: 'Tipo de solicitação inválido.' })
    }
    if (!categoryName && requestType !== 'create') {
      return res.status(400).json({ message: 'Informe a categoria do benefício.' })
    }
    if (requestType === 'create' && categoryName.length < 2) {
      return res.status(400).json({ message: 'Nome da categoria inválido.' })
    }
    if (!proposedMonthlyCap || proposedMonthlyCap <= 0) {
      return res.status(400).json({ message: 'Informe um teto mensal válido.' })
    }
    if (!justification || justification.length < 5) {
      return res.status(400).json({ message: 'Justificativa obrigatória (mín. 5 caracteres).' })
    }

    let resolvedName = categoryName
    let currentMonthlyCap = null
    let resolvedCategoryId = categoryId

    if (requestType !== 'create') {
      const category = categoryId
        ? await prisma.category.findUnique({ where: { id: categoryId } })
        : await prisma.category.findFirst({ where: { nome: categoryName } })
      if (!category) {
        return res.status(404).json({ message: 'Categoria não encontrada.' })
      }
      resolvedName = category.nome
      resolvedCategoryId = category.id
      currentMonthlyCap = Number(category.limite)

      if (requestType === 'increase' && proposedMonthlyCap <= currentMonthlyCap) {
        return res.status(400).json({
          message: 'Para aumento, o novo teto deve ser maior que o atual.'
        })
      }
      if (requestType === 'decrease' && proposedMonthlyCap >= currentMonthlyCap) {
        return res.status(400).json({
          message: 'Para redução, o novo teto deve ser menor que o atual.'
        })
      }
    } else {
      const exists = await prisma.category.findFirst({ where: { nome: resolvedName } })
      if (exists) {
        return res.status(409).json({
          message: 'Categoria já existe. Use solicitação de aumento em vez de criação.'
        })
      }
    }

    const needsApproval = requiresSuperiorApproval(
      requestType,
      currentMonthlyCap,
      proposedMonthlyCap
    )

    // Financeiro nunca auto-aplica — qualquer proposta sua exige aprovação do gestor
    const canAutoApplyDecrease =
      requestType === 'decrease' &&
      CEILING_APPROVER_ROLES.includes(req.auth.role) &&
      req.auth.role !== 'financeiro' &&
      !needsApproval

    const initialStatus = canAutoApplyDecrease
      ? WORKFLOW_STATUS.CONCLUIDA
      : WORKFLOW_STATUS.EM_ANALISE

    const row = await prisma.benefitCeilingProposal.create({
      data: {
        requestType,
        categoryId: resolvedCategoryId,
        categoryName: resolvedName,
        employeeRole,
        currentMonthlyCap,
        proposedMonthlyCap,
        proposedMaxPerTx: proposedMaxPerTx || null,
        status: initialStatus,
        justification,
        requesterEmail: req.auth.email,
        requesterRole: req.auth.role,
        createdAt: new Date().toLocaleDateString('pt-BR')
      }
    })

    await prisma.ceilingProposalEvent.create({
      data: {
        proposalId: row.id,
        fromStatus: null,
        toStatus: initialStatus,
        actorEmail: req.auth.email,
        note:
          requestType === 'create'
            ? 'Proposta de novo teto de benefício'
            : `Proposta de ${requestType === 'increase' ? 'aumento' : 'redução'} de teto`,
        createdAt: new Date().toISOString()
      }
    })

    if (initialStatus === WORKFLOW_STATUS.CONCLUIDA) {
      await applyApprovedCeilingProposal(row)
    }

    await logBusinessEvent({
      action: 'CEILING_PROPOSAL_CREATED',
      actorEmail: req.auth.email,
      module: 'ceiling_proposals',
      entityId: row.id,
      payload: {
        requestType,
        categoryName: resolvedName,
        proposedMonthlyCap,
        status: initialStatus
      }
    })

    if (initialStatus === WORKFLOW_STATUS.EM_ANALISE) {
      await publishNotificationEvent({
        type: NOTIFICATION_EVENTS.CEILING_SUBMITTED,
        payload: {
          proposalId: row.id,
          requesterEmail: req.auth.email,
          categoryName: resolvedName,
          requestType,
          proposedMonthlyCap
        }
      })
    }

    res.status(201).json({ proposal: serializeCeilingProposal(row) })
  })
)

app.post(
  '/api/ceiling-proposals/:id/decision',
  authRequired,
  roleRequired(CEILING_APPROVER_ROLES),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    const decision = String(req.body?.decision || '').trim().toLowerCase()
    const justification = String(req.body?.justification || '').trim()
    if (!['aprovado', 'reprovado'].includes(decision)) {
      return res.status(400).json({ message: 'Decisão inválida.' })
    }
    if (!justification || justification.length < 5) {
      return res.status(400).json({ message: 'Justificativa obrigatória (mín. 5 caracteres).' })
    }

    const proposal = await prisma.benefitCeilingProposal.findUnique({ where: { id } })
    if (!proposal) return res.status(404).json({ message: 'Proposta não encontrada.' })
    if (![WORKFLOW_STATUS.EM_ANALISE, WORKFLOW_STATUS.PENDENTE].includes(proposal.status)) {
      return res.status(400).json({ message: 'Somente propostas em análise podem receber decisão.' })
    }

    if (decision === 'reprovado') {
      const updated = await transitionCeilingProposal({
        proposalId: id,
        toStatus: WORKFLOW_STATUS.REPROVADO,
        actorEmail: req.auth.email,
        note: `Reprovado: ${justification}`
      })
      await logBusinessEvent({
        action: 'CEILING_PROPOSAL_REJECTED',
        actorEmail: req.auth.email,
        module: 'ceiling_proposals',
        entityId: id,
        payload: { justification }
      })
      await publishNotificationEvent({
        type: NOTIFICATION_EVENTS.CEILING_DECIDED,
        payload: {
          proposalId: id,
          requesterEmail: proposal.requesterEmail,
          decision: 'reprovado',
          categoryName: proposal.categoryName
        }
      })
      return res.json({ proposal: serializeCeilingProposal(updated) })
    }

    await applyApprovedCeilingProposal(proposal)
    const updated = await transitionCeilingProposal({
      proposalId: id,
      toStatus: WORKFLOW_STATUS.CONCLUIDA,
      actorEmail: req.auth.email,
      note: `Aprovado e aplicado: ${justification}`
    })

    await logBusinessEvent({
      action: 'CEILING_PROPOSAL_APPROVED',
      actorEmail: req.auth.email,
      module: 'ceiling_proposals',
      entityId: id,
      payload: { justification, categoryName: proposal.categoryName }
    })

    await publishNotificationEvent({
      type: NOTIFICATION_EVENTS.CEILING_DECIDED,
      payload: {
        proposalId: id,
        requesterEmail: proposal.requesterEmail,
        decision: 'aprovado',
        categoryName: proposal.categoryName
      }
    })

    res.json({ proposal: serializeCeilingProposal(updated) })
  })
)

app.get(
  '/api/admin/audit',
  authRequired,
  adminRequired,
  asyncHandler(async (_req, res) => {
    const rawEvents = await fetchRecentAudit(100)
    const events = rawEvents.map((ev) => ({
      ...ev,
      module: ev.payload?.module || 'geral',
      outcome: ev.payload?.outcome || null,
      entityId: ev.payload?.entityId ?? null
    }))
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
      liquidado: WORKFLOW_STATUS.LIQUIDADO,
      concluida: WORKFLOW_STATUS.CONCLUIDA
    }
    const selected = mapStatus[rawStatus]
    const rows = await prisma.transaction.findMany({
      where: selected
        ? { status: selected }
        : {
            status: {
              in: [
                WORKFLOW_STATUS.PENDENTE,
                WORKFLOW_STATUS.EM_ANALISE,
                WORKFLOW_STATUS.APROVADO,
                WORKFLOW_STATUS.REPROVADO,
                WORKFLOW_STATUS.LIQUIDADO,
                WORKFLOW_STATUS.CONCLUIDA
              ]
            }
          },
      include: {
        user: true,
        events: { where: { fromStatus: null }, orderBy: { id: 'asc' }, take: 1 }
      },
      orderBy: { id: 'desc' }
    })

    function resolveOperationType(row) {
      const d = row.descricao || ''
      if (d.startsWith('Realocação')) return 'realocacao'
      if (d.startsWith('Alocação manual') || d.startsWith('Crédito')) return 'alocacao'
      if (d.startsWith('Carga mensal')) return 'carga'
      return 'utilizacao'
    }

    // O par Entrada de uma realocação é auto-decidido; só mostrar o Saída ao gestor.
    const filtered = rows.filter(
      (row) => !(row.tipo === 'Entrada' && (row.descricao || '').startsWith('Realocação de'))
    )

    const approvals = filtered.map((row) => {
      const initialEvent = row.events[0]
      const actorEmail = initialEvent?.actorEmail || row.user.email
      return {
        id: row.id,
        beneficiaryName: row.user.nome,
        beneficiaryEmail: row.user.email,
        actorEmail,
        category: row.categoria,
        amount: Number(row.valor),
        tipo: row.tipo,
        operationType: resolveOperationType(row),
        status: row.status.toLowerCase().replaceAll(' ', '_'),
        requestedAt: row.data,
        description: row.descricao || ''
      }
    })
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
      where: {
        status: {
          in: [
            WORKFLOW_STATUS.EM_ANALISE,
            WORKFLOW_STATUS.PENDENTE,
            WORKFLOW_STATUS.APROVADO,
            WORKFLOW_STATUS.REPROVADO,
            WORKFLOW_STATUS.LIQUIDADO
          ]
        }
      },
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
    const decisionNote = `Decisão gerencial: ${decision}${justification ? ` (${justification})` : ''}`

    await transitionStatus({ transactionId: id, toStatus: status, actorEmail: req.auth.email, note: decisionNote })

    const descSuffix = `— decisão gestor: ${decision}${justification ? ` (${justification})` : ''}`
    const updated = await prisma.transaction.update({
      where: { id },
      data: { descricao: `${tx.descricao || 'Solicitação'} ${descSuffix}` },
      include: { user: true }
    })

    // Se for parte de um par de realocação, decide o par automaticamente
    if (tx.descricao?.includes('Realocação')) {
      const paired = await prisma.transaction.findFirst({
        where: {
          id: { not: id },
          userId: tx.userId,
          data: tx.data,
          valor: tx.valor,
          status: { in: [WORKFLOW_STATUS.EM_ANALISE, WORKFLOW_STATUS.PENDENTE] },
          descricao: { contains: 'Realocação' }
        }
      })
      if (paired) {
        await transitionStatus({
          transactionId: paired.id,
          toStatus: status,
          actorEmail: req.auth.email,
          note: `Par de realocação — ${decisionNote}`
        })
        await prisma.transaction.update({
          where: { id: paired.id },
          data: { descricao: `${paired.descricao || ''} ${descSuffix}` }
        })
      }
    }

    const initialEvent = await prisma.workflowEvent.findFirst({
      where: { transactionId: id, fromStatus: null },
      orderBy: { id: 'asc' }
    })

    await logBusinessEvent({
      action: 'MANAGER_DECISION',
      actorEmail: req.auth.email,
      module: 'approvals',
      entityId: id,
      payload: { transactionId: id, decision }
    })

    await publishNotificationEvent({
      type: NOTIFICATION_EVENTS.APPROVAL_DECIDED,
      payload: {
        transactionId: id,
        decision,
        actorEmail: initialEvent?.actorEmail || tx.user.email,
        beneficiaryUserId: tx.userId,
        description: tx.descricao || ''
      }
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
  '/api/finance/closing/export-data',
  authRequired,
  roleRequired(['financeiro', 'administrador']),
  asyncHandler(async (req, res) => {
    const { month, year } = parseClosingMonthYear(req.query)
    const data = await buildClosingExport(month, year)
    res.json(data)
  })
)

app.get(
  '/api/finance/closing/export.csv',
  authRequired,
  roleRequired(['financeiro', 'administrador']),
  asyncHandler(async (req, res) => {
    const { month, year } = parseClosingMonthYear(req.query)
    const data = await buildClosingExport(month, year)
    const filename = `fechamento-flexben-${year}-${String(month).padStart(2, '0')}.csv`
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(buildClosingCsv(data))
  })
)

app.use((err, _req, res, _next) => {
  console.error(err)
  if (err.type === 'entity.too.large' || err.status === 413) {
    return res.status(413).json({
      message:
        'Arquivo muito grande. O app comprime fotos automaticamente; tente outra imagem ou atualize a página.'
    })
  }
  if (err.code === 'P2002') {
    return res.status(409).json({ message: 'Registro duplicado.' })
  }
  res.status(500).json({ message: 'Erro interno no servidor.' })
})

const broker = createMessageBroker()
await broker.startConsumer(handleNotificationEvent)

const server = app.listen(PORT, () => {
  console.log(`API FlexBen na porta ${PORT} (${NODE_ENV})`)
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[erro] Porta ${PORT} já está em uso.`)
    console.error(`  → Rode: npm run dev:kill-port   (ou: kill $(lsof -t -i:${PORT}))`)
    console.error(`  → Ou altere PORT no arquivo backend/.env`)
    process.exit(1)
  }
  throw err
})
