const TOKEN_KEY = 'auth_token'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (res.status === 204) return null
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Falha na requisição.')
  return data
}

async function requestText(path, options = {}) {
  const headers = { ...(options.headers || {}) }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  const text = await res.text()
  if (!res.ok) {
    try {
      const data = JSON.parse(text)
      throw new Error(data.message || 'Falha na requisição.')
    } catch {
      throw new Error('Falha na requisição.')
    }
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
