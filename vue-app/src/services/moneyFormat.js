/** Formatação e parsing de valores em Real (pt-BR). */

export function roundMoney(n) {
  const x = Number(n)
  if (!Number.isFinite(x)) return 0
  return Math.round(x * 100) / 100
}

/** Ex.: 1234.56 → "1.234,56" */
export function formatMoneyDisplay(amount) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return ''
  return n.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

/** Dígitos digitados (centavos) → valor em reais. Ex.: "123456" → 1234.56 */
export function parseMoneyDigits(digitsOnly) {
  const raw = String(digitsOnly || '').replace(/\D/g, '')
  if (!raw) return null
  const cents = parseInt(raw, 10)
  if (!Number.isFinite(cents)) return null
  return roundMoney(cents / 100)
}

/** Valor numérico → string só com dígitos (centavos). */
export function moneyToDigits(amount) {
  if (amount == null || amount === '') return ''
  const n = Number(amount)
  if (!Number.isFinite(n) || n < 0) return ''
  return String(Math.round(n * 100))
}

/** Formata dígitos crus para exibição enquanto digita. */
export function formatDigitsAsMoney(digitsOnly) {
  const parsed = parseMoneyDigits(digitsOnly)
  if (parsed == null) return ''
  return formatMoneyDisplay(parsed)
}

/** Aceita número ou texto já com vírgula/ponto. */
export function parseMoneyInput(value) {
  if (value == null || value === '') return null
  if (typeof value === 'number') {
    return Number.isFinite(value) ? roundMoney(value) : null
  }
  const s = String(value).trim()
  if (!s) return null
  const digits = s.replace(/\D/g, '')
  if (digits && !s.includes(',') && !s.includes('.') && digits.length <= 3) {
    return parseMoneyDigits(digits)
  }
  const normalized = s.replace(/\./g, '').replace(',', '.')
  const n = Number(normalized)
  return Number.isFinite(n) ? roundMoney(n) : null
}
