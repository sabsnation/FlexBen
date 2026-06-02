/** Tipos de evento publicados na fila de notificações. */
export const NOTIFICATION_EVENTS = Object.freeze({
  APPROVAL_SUBMITTED: 'approval.submitted',
  APPROVAL_DECIDED: 'approval.decided',
  CEILING_SUBMITTED: 'ceiling.submitted',
  CEILING_DECIDED: 'ceiling.decided',
  USAGE_SUBMITTED: 'usage.submitted'
})

export const QUEUE_NOTIFICATIONS = 'flexben.notifications'
