import { prisma } from './prisma.js'

const SETTLED_STATUSES = ['Concluída', 'Aprovado', 'Liquidado']

export function parseMonthYearQuery(query) {
  const month = Number(query.month || 0)
  const year = Number(query.year || 0)
  if (!month || !year || month < 1 || month > 12 || year < 2000) {
    const now = new Date()
    return { month: now.getMonth() + 1, year: now.getFullYear() }
  }
  return { month, year }
}

function parsePtBrDate(value) {
  if (!value || typeof value !== 'string') return null
  const parts = value.split('/')
  if (parts.length !== 3) return null
  const [dd, mm, yyyy] = parts.map(Number)
  if (!dd || !mm || !yyyy) return null
  const d = new Date(yyyy, mm - 1, dd)
  if (Number.isNaN(d.getTime())) return null
  return d
}

export function dateMatchesMonthYear(ptBrDate, month, year) {
  const d = parsePtBrDate(ptBrDate)
  if (!d) return false
  return d.getMonth() + 1 === month && d.getFullYear() === year
}

export async function buildClosingExport(month, year) {
  const rows = await prisma.transaction.findMany({
    where: { status: { in: SETTLED_STATUSES } },
    include: { user: true },
    orderBy: { id: 'asc' }
  })

  const inPeriod = rows.filter((r) => dateMatchesMonthYear(r.data, month, year))
  const pendingCount = await prisma.transaction.count({
    where: { status: { in: ['Pendente', 'Em análise'] } }
  })

  const byCategory = new Map()
  for (const row of inPeriod) {
    const key = row.categoria
    const cur = byCategory.get(key) || { category: key, total: 0, count: 0 }
    cur.total += Number(row.valor)
    cur.count += 1
    byCategory.set(key, cur)
  }

  const lines = Array.from(byCategory.values()).sort((a, b) => b.total - a.total)
  const approvedTotal = lines.reduce((sum, l) => sum + l.total, 0)
  const referenceMonth = `${String(month).padStart(2, '0')}/${year}`

  const transactions = inPeriod.map((r) => ({
    id: r.id,
    data: r.data,
    usuarioNome: r.user.nome,
    usuarioEmail: r.user.email,
    categoria: r.categoria,
    tipo: r.tipo,
    valor: Number(r.valor),
    status: r.status,
    descricao: r.descricao || ''
  }))

  return {
    summary: {
      referenceMonth,
      approvedTotal,
      pendingCount,
      transactionCount: transactions.length
    },
    lines,
    transactions
  }
}

/** CSV com BOM e separador ; para Excel em PT-BR */
export function buildClosingCsv(exportData) {
  const header = [
    'ID',
    'Data',
    'Colaborador',
    'E-mail',
    'Categoria',
    'Tipo',
    'Valor (R$)',
    'Status',
    'Descrição'
  ]

  const escapeCell = (v) => {
    const s = String(v ?? '')
    if (s.includes(';') || s.includes('"') || s.includes('\n')) {
      return `"${s.replaceAll('"', '""')}"`
    }
    return s
  }

  const body = exportData.transactions.map((r) =>
    [
      r.id,
      r.data,
      r.usuarioNome,
      r.usuarioEmail,
      r.categoria,
      r.tipo,
      r.valor.toFixed(2).replace('.', ','),
      r.status,
      r.descricao
    ]
      .map(escapeCell)
      .join(';')
  )

  const meta = [
    `Relatório de fechamento FlexBen;${exportData.summary.referenceMonth}`,
    `Total aprovado no período;${exportData.summary.approvedTotal.toFixed(2).replace('.', ',')}`,
    `Movimentos no período;${exportData.summary.transactionCount}`,
    ''
  ]

  return `\uFEFF${[...meta, header.join(';'), ...body].join('\r\n')}`
}
