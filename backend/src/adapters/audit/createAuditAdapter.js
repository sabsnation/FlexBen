import { FirestoreAuditAdapter, isFirebaseCredentialEnvSet } from './FirestoreAuditAdapter.js'
import { NoopAuditAdapter } from './NoopAuditAdapter.js'

let _instance = null

/**
 * Factory: escolhe implementação conforme ambiente (Adapter + Strategy leve).
 */
export function createAuditAdapter() {
  if (_instance) return _instance

  if (isFirebaseCredentialEnvSet()) {
    _instance = new FirestoreAuditAdapter()
  } else {
    _instance = new NoopAuditAdapter()
  }

  return _instance
}

export { isFirebaseCredentialEnvSet }
