import { createAuditAdapter, isFirebaseCredentialEnvSet } from '../adapters/audit/createAuditAdapter.js'

export { isFirebaseCredentialEnvSet }

export function isFirestoreReady() {
  return createAuditAdapter().isReady()
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
