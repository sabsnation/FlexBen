/**
 * Broker síncrono: processa eventos na mesma thread (sem RabbitMQ).
 * Usado quando RABBITMQ_URL não está configurada.
 */
export class InlineMessageBroker {
  #handler = null

  async startConsumer(handler) {
    this.#handler = handler
  }

  async publish(event) {
    if (!this.#handler) {
      console.warn('[messaging] Consumer não iniciado; evento ignorado:', event?.type)
      return
    }
    await this.#handler(event)
  }

  async close() {}
}
