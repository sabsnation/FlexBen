import { resolveApiBase, PRODUCTION_RENDER_ORIGIN } from './config/apiConfig.js'

const TOKEN_KEY = 'auth_token'

function getCandidateBases() {
  const primary = resolveApiBase()
  const bases = [primary]
  const renderApi = `${PRODUCTION_RENDER_ORIGIN}/api`

  if (!primary.includes('onrender.com')) {
    bases.push(renderApi)
  }

  if (typeof window !== 'undefined') {
    const sameOrigin = `${window.location.origin}/api`
    if (!bases.includes(sameOrigin)) bases.unshift(sameOrigin)
  }

  return [...new Set(bases)]
}

export function getApiBase() {
  return resolveApiBase()
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

function buildUrl(base, path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalizedPath}`
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
  if (res.status === 502 || res.status === 503) {
    return new Error('API ainda iniciando ou indisponível. Aguarde alguns segundos e atualize a página.')
  }
  if (res.status === 403) return new Error('Acesso negado para o seu perfil.')
  if (res.status === 404) {
    if (text && text.includes('Cannot GET')) {
      return new Error(
        'Rota de alocação indisponível nesta API. Aguarde o deploy do backend no Render (1–3 min após o push).'
      )
    }
    return new Error('Recurso não encontrado na API.')
  }
  if (res.status === 413) {
    return new Error(
      data?.message || 'Arquivo muito grande. Use uma foto menor ou deixe o app comprimir automaticamente.'
    )
  }
  if (res.status >= 500) return new Error('Erro interno no servidor. Tente novamente em instantes.')
  if (text && text.startsWith('<')) {
    return new Error('Resposta inválida da API. Verifique a URL da API no deploy.')
  }
  return new Error(`Falha na requisição (HTTP ${res.status}).`)
}

async function requestWithBase(base, path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(buildUrl(base, path), {
    ...options,
    headers,
    cache: 'no-store'
  })

  if (res.status === 204) return { res, data: null, text: '' }

  const text = await res.text()
  const data = parseResponseBody(text)
  return { res, data, text }
}

async function request(path, options = {}) {
  const bases = getCandidateBases()
  let lastError

  for (let i = 0; i < bases.length; i += 1) {
    const base = bases[i]
    try {
      const { res, data, text } = await requestWithBase(base, path, options)

      if (!res.ok) {
        const err = errorFromResponse(res, data, text)
        const isMissingRoute =
          res.status === 404 && text && (text.includes('Cannot GET') || text.includes('Cannot POST'))
        if (isMissingRoute && i < bases.length - 1) {
          lastError = err
          continue
        }
        throw err
      }

      if (res.status === 304) {
        throw new Error('Resposta em cache inválida. Atualize a página.')
      }
      if (data === null && text) throw errorFromResponse(res, data, text)
      if (data === null) {
        throw new Error('Resposta vazia da API. Tente novamente.')
      }
      return data
    } catch (e) {
      lastError = e
      const isNetwork = e instanceof TypeError || e.message?.includes('Failed to fetch')
      if (isNetwork && i < bases.length - 1) continue
      if (i < bases.length - 1 && e.message?.includes('indisponível')) continue
      throw e
    }
  }

  throw (
    lastError ||
    new Error('Sem conexão com a API. Verifique o backend no Render ou use npm run dev localmente.')
  )
}

async function requestText(path, options = {}) {
  const bases = getCandidateBases()
  let lastError

  for (let i = 0; i < bases.length; i += 1) {
    const base = bases[i]
    try {
      const headers = { ...(options.headers || {}) }
      const token = getToken()
      if (token) headers.Authorization = `Bearer ${token}`

      const res = await fetch(buildUrl(base, path), {
        ...options,
        headers,
        cache: 'no-store'
      })
      const text = await res.text()
      if (!res.ok) {
        const data = parseResponseBody(text)
        const err = errorFromResponse(res, data, text)
        if (res.status === 404 && i < bases.length - 1) {
          lastError = err
          continue
        }
        throw err
      }
      return text
    } catch (e) {
      lastError = e
      if (i < bases.length - 1) continue
      throw e
    }
  }

  throw lastError || new Error('Sem conexão com a API.')
}

export const api = {
  get: (path) => request(path),
  getText: (path) => requestText(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' })
}
