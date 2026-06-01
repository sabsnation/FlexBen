import { prisma } from '../lib/prisma.js'
import { logBusinessEvent } from '../lib/businessAudit.js'

const CREDIT_ELIGIBLE_ROLES = ['colaborador', 'gestor']

export function registerCreditRoutes(app, {
  authRequired,
  roleRequired,
  asyncHandler,
  publicUser,
  serializeTransaction,
  parseMoney,
  balanceInCategory,
  WORKFLOW_STATUS,
  FINANCE_OPS_ROLES
}) {
  app.get(
    '/api/credits/eligible-users',
    authRequired,
    roleRequired(FINANCE_OPS_ROLES),
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
    roleRequired(FINANCE_OPS_ROLES),
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
    roleRequired(FINANCE_OPS_ROLES),
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
}
