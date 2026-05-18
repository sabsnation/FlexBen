/**
 * RF07 — validação reutilizável de formulários (camada de serviço).
 */

export function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0
}

export function isValidEmail(v) {
  if (!isNonEmptyString(v)) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
}

export function minLength(v, n) {
  return typeof v === 'string' && v.length >= n
}

export function assertLoginForm(email, senha) {
  if (!isNonEmptyString(email) || !isNonEmptyString(senha)) {
    throw new Error('Preencha e-mail e senha.')
  }
  if (!isValidEmail(email)) {
    throw new Error('Informe um e-mail válido.')
  }
}

export function assertCadastroForm({ nome, email, senha }) {
  if (!isNonEmptyString(nome) || nome.trim().length < 2) {
    throw new Error('Informe seu nome completo (mínimo 2 caracteres).')
  }
  if (!isValidEmail(email)) {
    throw new Error('Informe um e-mail corporativo válido.')
  }
  if (!minLength(senha, 6)) {
    throw new Error('A senha deve ter pelo menos 6 caracteres.')
  }
}

export function assertRecoverPasswordForm(email) {
  if (!isValidEmail(email)) {
    throw new Error('Informe um e-mail corporativo válido.')
  }
}

export function assertCategoryForm({ nome, limite }) {
  const n = nome?.trim()
  const val = Number(limite)
  if (!n || n.length < 2) {
    throw new Error('Informe o nome da categoria (mínimo 2 caracteres).')
  }
  if (!val || val <= 0) {
    throw new Error('Informe um limite mensal válido (maior que zero).')
  }
}
