import { FirestoreAuditAdapter, isFirebaseCredentialEnvSet } from './FirestoreAuditAdapter.js'
import { MongoAuditAdapter, isMongoCredentialEnvSet } from './MongoAuditAdapter.js'
import { NoopAuditAdapter } from './NoopAuditAdapter.js'

let _instance = null

/**
 * Factory: escolhe a implementação de auditoria conforme variáveis de ambiente.
 *
 * Ordem de prioridade:
 *  1. AUDIT_PROVIDER=firestore|mongo|noop (explícito)
 *  2. MONGODB_URI definido       → MongoDB
 *  3. Credencial Firebase definida → Firestore
 *  4. fallback Noop (auditoria desligada)
 */
export function createAuditAdapter() {
  if (_instance) return _instance

  const explicit = (process.env.AUDIT_PROVIDER || '').trim().toLowerCase()

  if (explicit === 'firestore') {
    _instance = new FirestoreAuditAdapter()
  } else if (explicit === 'mongo' || explicit === 'mongodb') {
    _instance = new MongoAuditAdapter()
  } else if (explicit === 'noop' || explicit === 'off') {
    _instance = new NoopAuditAdapter()
  } else if (isMongoCredentialEnvSet()) {
    _instance = new MongoAuditAdapter()
  } else if (isFirebaseCredentialEnvSet()) {
    _instance = new FirestoreAuditAdapter()
  } else {
    _instance = new NoopAuditAdapter()
  }

  return _instance
}

export { isFirebaseCredentialEnvSet, isMongoCredentialEnvSet }
