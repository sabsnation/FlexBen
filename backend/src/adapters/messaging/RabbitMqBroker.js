import amqp from 'amqplib'
import { QUEUE_NOTIFICATIONS } from '../../lib/notificationEvents.js'

/**
 * Adapter RabbitMQ: publica eventos na fila e consome com worker no mesmo processo.
 */
export class RabbitMqBroker {
  #handler = null

  constructor(url) {
    this.url = url
    this.connection = null
    this.channel = null
  }

  async #ensureChannel() {
    if (this.channel) return this.channel
    this.connection = await amqp.connect(this.url)
    this.connection.on('error', (err) => {
      console.error('[rabbitmq] connection error:', err.message)
    })
    this.connection.on('close', () => {
      console.warn('[rabbitmq] conexão fechada')
      this.channel = null
      this.connection = null
    })
    this.channel = await this.connection.createChannel()
    await this.channel.assertQueue(QUEUE_NOTIFICATIONS, { durable: true })
    return this.channel
  }

  async startConsumer(handler) {
    this.#handler = handler
    const ch = await this.#ensureChannel()
    ch.prefetch(1)
    await ch.consume(
      QUEUE_NOTIFICATIONS,
      async (msg) => {
        if (!msg) return
        try {
          const event = JSON.parse(msg.content.toString())
          await handler(event)
          ch.ack(msg)
          console.log(`[rabbitmq] mensagem consumida e processada: ${event?.type || '?'}`)
        } catch (err) {
          console.error('[rabbitmq] falha ao processar mensagem:', err.message)
          ch.nack(msg, false, false)
        }
      },
      { noAck: false }
    )
    console.log(`[rabbitmq] consumindo fila "${QUEUE_NOTIFICATIONS}"`)
  }

  async publish(event) {
    const ch = await this.#ensureChannel()
    const body = Buffer.from(JSON.stringify(event))
    ch.sendToQueue(QUEUE_NOTIFICATIONS, body, { persistent: true })
    console.log(`[rabbitmq] publicado na fila "${QUEUE_NOTIFICATIONS}": ${event?.type || '?'}`)
  }

  async close() {
    try {
      await this.channel?.close()
      await this.connection?.close()
    } catch {
      /* ignore */
    }
    this.channel = null
    this.connection = null
  }
}
