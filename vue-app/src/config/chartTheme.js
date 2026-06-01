export const CHART_PALETTE = [
  '#6366f1',
  '#10b981',
  '#f59e0b',
  '#0ea5e9',
  '#a855f7',
  '#ec4899',
  '#14b8a6',
  '#ef4444',
  '#64748b'
]

export function colorAt(index) {
  return CHART_PALETTE[index % CHART_PALETTE.length]
}

export function categoryColor(name, index = 0) {
  const map = {
    Alimentação: '#f59e0b',
    Mobilidade: '#0ea5e9',
    Saúde: '#10b981',
    Educação: '#6366f1',
    Cultura: '#a855f7',
    'Home Office': '#ec4899',
    'Bem-estar': '#14b8a6'
  }
  return map[name] || colorAt(index)
}

export function formatChartCurrency(v) {
  return Number(v || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0
  })
}

export function formatChartCompact(v) {
  const n = Number(v) || 0
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(Math.round(n))
}
