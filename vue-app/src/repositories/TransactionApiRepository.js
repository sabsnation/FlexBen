import { httpApiClient } from '../adapters/HttpApiClient.js'

/**
 * Repositório (Adapter): transações via API REST.
 */
export class TransactionApiRepository {
  constructor(client = httpApiClient) {
    this.client = client
  }

  async list() {
    return this.client.get('/transactions')
  }

  async getMyBalances() {
    const { balances } = await this.client.get('/me/balances')
    return balances
  }

  async getUserBalances(userId) {
    return this.client.get(`/credits/users/${userId}/balances`)
  }

  async createReallocation(payload) {
    await this.client.post('/reallocations', payload)
  }

  async registerUsage(payload) {
    await this.client.post('/usage', payload)
  }

  async remove(id) {
    await this.client.delete(`/transactions/${id}`)
  }

  async getWorkflowEvents(id) {
    const { events } = await this.client.get(`/transactions/${id}/workflow`)
    return events
  }

  async runMonthlyLoad() {
    const { created } = await this.client.post('/admin/monthly-load', {})
    return created
  }
}

export const transactionRepository = new TransactionApiRepository()
