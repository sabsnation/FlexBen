import { InlineMessageBroker } from './InlineMessageBroker.js'
import { RabbitMqBroker } from './RabbitMqBroker.js'

let _instance = null

/**
 * Factory: RabbitMQ se RABBITMQ_URL definida; senão processamento inline.
 */
export function createMessageBroker() {
  if (_instance) return _instance

  const url = (process.env.RABBITMQ_URL || '').trim()
  if (url) {
    _instance = new RabbitMqBroker(url)
    console.log('[messaging] RabbitMQ habilitado')
  } else {
    _instance = new InlineMessageBroker()
    console.log('[messaging] modo inline (defina RABBITMQ_URL para RabbitMQ)')
  }

  return _instance
}

export function isRabbitMqEnabled() {
  return Boolean((process.env.RABBITMQ_URL || '').trim())
}
