import fs from 'fs'
import path from 'path'
import admin from 'firebase-admin'

const COLLECTION = 'audit_events'

function loadServiceAccountJson() {
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT?.trim()
  if (inline) return JSON.parse(inline)

  const filePath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim() ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()
  if (!filePath) return null

  const resolved = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath)

  if (!fs.existsSync(resolved)) {
    throw new Error(`Arquivo de credenciais não encontrado: ${resolved}`)
  }

  return JSON.parse(fs.readFileSync(resolved, 'utf8'))
}

export function isFirebaseCredentialEnvSet() {
  return Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT?.trim() ||
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim() ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()
  )
}

/**
 * Adapter: persistência de auditoria no Firestore (NoSQL append-only).
 */
export class FirestoreAuditAdapter {
  constructor() {
    this._db = null
    this._initAttempted = false
    this._initError = null
  }

  _getDb() {
    if (this._db) return this._db
    if (this._initAttempted) return null
    this._initAttempted = true

    try {
      const cred = loadServiceAccountJson()
      if (!cred) return null
      if (!admin.apps.length) {
        admin.initializeApp({ credential: admin.credential.cert(cred) })
      }
      this._db = admin.firestore()
      return this._db
    } catch (err) {
      this._initError = err
      console.warn('[firebase] Não foi possível iniciar Firestore:', err.message)
      return null
    }
  }

  isReady() {
    return this._getDb() !== null
  }

  getInitError() {
    return this._initError
  }

  async append({ action, actorEmail, payload = {} }) {
    const db = this._getDb()
    if (!db) return
    await db.collection(COLLECTION).add({
      action,
      actorEmail: actorEmail || 'system',
      payload,
      createdAt: new Date().toISOString()
    })
  }

  async listRecent(limit = 80) {
    const db = this._getDb()
    if (!db) return []

    const snap = await db.collection(COLLECTION).limit(300).get()
    const items = snap.docs.map((d) => {
      const x = d.data()
      return {
        id: d.id,
        action: x.action,
        actorEmail: x.actorEmail,
        payload: x.payload || {},
        createdAt: typeof x.createdAt === 'string' ? x.createdAt : null
      }
    })
    items.sort((a, b) => {
      if (!a.createdAt) return 1
      if (!b.createdAt) return -1
      return b.createdAt.localeCompare(a.createdAt)
    })
    return items.slice(0, limit)
  }
}
