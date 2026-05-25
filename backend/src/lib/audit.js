import {
  createAuditAdapter,
  isFirebaseCredentialEnvSet,
  isMongoCredentialEnvSet
} from '../adapters/audit/createAuditAdapter.js'

export { isFirebaseCredentialEnvSet, isMongoCredentialEnvSet }

function getProviderName() {
  const explicit = (process.env.AUDIT_PROVIDER || '').trim().toLowerCase()
  if (explicit === 'firestore') return 'firestore'
  if (explicit === 'mongo' || explicit === 'mongodb') return 'mongo'
  if (explicit === 'noop' || explicit === 'off') return 'noop'
  if (isMongoCredentialEnvSet()) return 'mongo'
  if (isFirebaseCredentialEnvSet()) return 'firestore'
  return 'noop'
}

export function getAuditProvider() {
  return getProviderName()
}

export function isAuditReady() {
  const adapter = createAuditAdapter()
  const ready = adapter.isReady?.()
  return ready === true
}

// compat (código antigo do server.js)
export function isFirestoreReady() {
  return getProviderName() === 'firestore' && isAuditReady()
}

export function getFirestoreInitError() {
  const adapter = createAuditAdapter()
  return adapter.getInitError?.() || null
}

export async function auditLog(event) {
  try {
    await createAuditAdapter().append(event)
  } catch (err) {
    console.warn('[audit] Falha ao gravar:', err.message)
  }
}

export async function fetchRecentAudit(limit = 80) {
  try {
    return await createAuditAdapter().listRecent(limit)
  } catch (err) {
    console.warn('[audit] Falha ao ler:', err.message)
    return []
  }
}
