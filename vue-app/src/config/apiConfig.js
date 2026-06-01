/** Backend Render em produção (health 200 neste host). */
export const PRODUCTION_RENDER_ORIGIN = 'https://flexben.onrender.com'

/**
 * Base da API sem barra final, sempre terminando em /api.
 * - Dev/prod com VITE_API_BASE_URL=/api → proxy Vite (local) ou Vercel rewrite (deploy).
 * - Override: VITE_API_BASE_URL=https://flexben.onrender.com/api
 */
export function resolveApiBase() {
  const fromEnv = (import.meta.env.VITE_API_BASE_URL || '').trim()
  if (fromEnv) {
    const raw = fromEnv.replace(/\/+$/, '')
    return raw.endsWith('/api') ? raw : `${raw}/api`
  }
  return '/api'
}
