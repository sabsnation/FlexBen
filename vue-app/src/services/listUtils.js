/** Parse DD/MM/YYYY, ISO or HTML date input (YYYY-MM-DD). */
export function parseFlexibleDate(value) {
  if (!value) return null
  const s = String(value).trim()
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (br) {
    const d = new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]), 12, 0, 0)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(`${s}T12:00:00`)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

export function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function endOfDay(d) {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

export function inDateRange(displayDate, fromInput, toInput) {
  const d = parseFlexibleDate(displayDate)
  if (!d) return true
  if (fromInput) {
    const from = parseFlexibleDate(fromInput)
    if (from && d < startOfDay(from)) return false
  }
  if (toInput) {
    const to = parseFlexibleDate(toInput)
    if (to && d > endOfDay(to)) return false
  }
  return true
}

const statusOrder = {
  'em análise': 1,
  pendente: 1,
  aprovado: 2,
  concluída: 3,
  concluida: 3,
  liquidado: 4,
  reprovado: 5
}

export function normalizeStatusKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function compareValues(a, b, type = 'string') {
  if (type === 'number') return (Number(a) || 0) - (Number(b) || 0)
  if (type === 'date') {
    const da = parseFlexibleDate(a)?.getTime() ?? 0
    const db = parseFlexibleDate(b)?.getTime() ?? 0
    return da - db
  }
  if (type === 'status') {
    const sa = statusOrder[normalizeStatusKey(a)] ?? 99
    const sb = statusOrder[normalizeStatusKey(b)] ?? 99
    return sa - sb
  }
  return String(a ?? '').localeCompare(String(b ?? ''), 'pt-BR', { sensitivity: 'base' })
}

export function sortRows(rows, key, dir = 'desc', getters = {}) {
  const mul = dir === 'asc' ? 1 : -1
  const getter = getters[key] || ((r) => r[key])
  const type = getters[`${key}__type`] || 'string'
  return [...rows].sort((a, b) => mul * compareValues(getter(a), getter(b), type))
}

export function downloadCsv(filename, headers, rows, mapRow) {
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = [
    headers.join(';'),
    ...rows.map((r) => mapRow(r).map((c) => (typeof c === 'number' ? String(c) : escape(c))).join(';'))
  ]
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
