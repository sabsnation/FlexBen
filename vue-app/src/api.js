const TOKEN_KEY = 'auth_token'

function normalizeApiBase(base) {
  const raw = (base || '/api').trim().replace(/\/+$/, '')
  if (raw.endsWith('/api')) return raw
  return `${raw}/api`
}

const API_BASE = normalizeApiBase(import.meta.env.VITE_API_BASE_URL)

export function getApiBase() {
  return API_BASE
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

function buildUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE}${normalizedPath}`
}

function parseResponseBody(text) {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function errorFromResponse(res, data, text) {
  if (data?.message) return new Error(data.message)
  if (res.status === 401) return new Error('Sessão expirada. Faça login novamente.')
  if (res.status === 403) return new Error('Acesso negado para o seu perfil.')
  if (res.status === 404) {
    return new Error(
      'Recurso não encontrado na API. Confirme se o backend está atualizado e em execução.'
    )
  }
  if (res.status >= 500) return new Error('Erro interno no servidor. Tente novamente em instantes.')
  if (text && text.startsWith('<')) {
    return new Error('Resposta inválida da API (HTML). Verifique a URL configurada em VITE_API_BASE_URL.')
  }
  return new Error(`Falha na requisição (HTTP ${res.status}).`)
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(buildUrl(path), { ...options, headers })
  } catch {
    throw new Error(
      'Sem conexão com a API. Inicie o backend (npm run dev:backend) ou verifique VITE_API_BASE_URL.'
    )
  }

  if (res.status === 204) return null

  const text = await res.text()
  const data = parseResponseBody(text)

  if (!res.ok) throw errorFromResponse(res, data, text)
  if (data === null && text) throw errorFromResponse(res, data, text)
  return data
}

async function requestText(path, options = {}) {
  const headers = { ...(options.headers || {}) }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(buildUrl(path), { ...options, headers })
  } catch {
    throw new Error('Sem conexão com a API.')
  }

  const text = await res.text()
  if (!res.ok) {
    const data = parseResponseBody(text)
    throw errorFromResponse(res, data, text)
  }
  return text
}

export const api = {
  get: (path) => request(path),
  getText: (path) => requestText(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' })
}
