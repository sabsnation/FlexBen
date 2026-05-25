/**
 * Adapter: persistência de auditoria no MongoDB (NoSQL append-only).
 *
 * Habilite com a variável de ambiente:
 *   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
 *
 * Coleção usada: "audit_events" (configurável via MONGODB_AUDIT_COLLECTION).
 *
 * Carrega `mongodb` dinamicamente para não exigir o pacote em ambientes
 * que usam outro provedor de auditoria (Firestore / Noop).
 */

const COLLECTION = process.env.MONGODB_AUDIT_COLLECTION || 'audit_events'

export function isMongoCredentialEnvSet() {
  return Boolean(process.env.MONGODB_URI?.trim())
}

export class MongoAuditAdapter {
  constructor() {
    this._client = null
    this._collection = null
    this._initAttempted = false
    this._initError = null
  }

  async _connect() {
    if (this._collection) return this._collection
    if (this._initAttempted) return null
    this._initAttempted = true

    try {
      const uri = process.env.MONGODB_URI?.trim()
      if (!uri) return null

      const { MongoClient } = await import('mongodb')
      this._client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 })
      await this._client.connect()

      const dbName = process.env.MONGODB_DB?.trim() || undefined
      const db = dbName ? this._client.db(dbName) : this._client.db()
      this._collection = db.collection(COLLECTION)

      await this._collection.createIndex({ createdAt: -1 }).catch(() => null)
      return this._collection
    } catch (err) {
      this._initError = err
      console.warn('[mongo-audit] Não foi possível conectar ao MongoDB:', err.message)
      return null
    }
  }

  isReady() {
    if (this._collection) return true
    if (this._initError) return false
    return isMongoCredentialEnvSet()
  }

  getInitError() {
    return this._initError
  }

  async append({ action, actorEmail, payload = {} }) {
    const col = await this._connect()
    if (!col) return
    await col.insertOne({
      action,
      actorEmail: actorEmail || 'system',
      payload,
      createdAt: new Date().toISOString()
    })
  }

  async listRecent(limit = 80) {
    const col = await this._connect()
    if (!col) return []
    const docs = await col.find({}).sort({ createdAt: -1 }).limit(limit).toArray()
    return docs.map((d) => ({
      id: String(d._id),
      action: d.action,
      actorEmail: d.actorEmail,
      payload: d.payload || {},
      createdAt: typeof d.createdAt === 'string' ? d.createdAt : null
    }))
  }
}
