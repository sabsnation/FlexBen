/**
 * Adapter nulo: auditoria desligada (sem credencial Firebase).
 */
export class NoopAuditAdapter {
  isReady() {
    return false
  }

  getInitError() {
    return null
  }

  async append() {}

  async listRecent() {
    return []
  }
}
