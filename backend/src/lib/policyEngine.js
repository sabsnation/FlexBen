import { prisma } from './prisma.js'

function sameMonth(dataStr, month, year) {
  if (!dataStr || typeof dataStr !== 'string') return false
  const parts = dataStr.split('/')
  if (parts.length !== 3) return false
  const [_, mm, yyyy] = parts
  return Number(mm) === month && Number(yyyy) === year
}

export async function resolvePolicyRule({ role, category, costCenter = '*' }) {
  const rules = await prisma.policyRule.findMany({
    where: {
      active: true,
      role,
      category,
      costCenter: { in: [costCenter, '*'] }
    },
    orderBy: { id: 'desc' }
  })
  if (!rules.length) return null
  return rules.find((r) => r.costCenter === costCenter) || rules[0]
}

export async function enforcePolicy({
  userId,
  role,
  category,
  amount,
  costCenter = '*'
}) {
  const rule = await resolvePolicyRule({ role, category, costCenter })
  if (!rule) return { rule: null, status: 'no_rule' }

  if (amount > Number(rule.maxPerTransaction)) {
    throw new Error(
      `Valor acima do limite por transação para ${category} (R$ ${Number(rule.maxPerTransaction).toFixed(2)}).`
    )
  }

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const existing = await prisma.transaction.findMany({
    where: {
      userId,
      categoria: category,
      tipo: 'Saída'
    }
  })
  const monthlySpent = existing
    .filter((x) => sameMonth(x.data, month, year))
    .reduce((sum, x) => sum + Number(x.valor), 0)

  if (monthlySpent + amount > Number(rule.monthlyCap)) {
    throw new Error(
      `Uso mensal excede o teto de ${category} (R$ ${Number(rule.monthlyCap).toFixed(2)}).`
    )
  }

  return { rule, status: rule.requiresApproval ? 'requires_approval' : 'auto_approved' }
}
