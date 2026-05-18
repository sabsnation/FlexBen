import { auditLog } from './audit.js'

export async function logBusinessEvent({
  action,
  actorEmail,
  module,
  entityId = null,
  outcome = 'success',
  payload = {}
}) {
  await auditLog({
    action,
    actorEmail,
    payload: {
      module,
      entityId,
      outcome,
      ...payload
    }
  })
}
