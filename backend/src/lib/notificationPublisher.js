import { createMessageBroker } from '../adapters/messaging/createMessageBroker.js'

/**
 * Publica evento de notificação na fila (RabbitMQ) ou processa inline.
 */
export async function publishNotificationEvent(event) {
  try {
    const broker = createMessageBroker()
    await broker.publish(event)
  } catch (err) {
    console.error('[notifications] falha ao publicar evento:', err.message)
  }
}
