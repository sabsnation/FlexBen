import { httpApiClient } from '../adapters/HttpApiClient.js'

/**
 * Repositório (Adapter): transações via API REST.
 */
export class TransactionApiRepository {
  constructor(client = httpApiClient) {
    this.client = client
  }

  async list({ scope } = {}) {
    const query = scope === 'all' ? '?scope=all' : ''
    return this.client.get(`/transactions${query}`)
  }

  async getMyBalances() {
    const data = await this.client.get('/me/balances')
    if (Array.isArray(data)) return data
    return data?.balances || []
  }

  async getUserBalances(userId) {
    const data = await this.client.get(`/credits/users/${userId}/balances`)
    if (Array.isArray(data?.balances)) return data
    if (Array.isArray(data)) return { balances: data }
    return { balances: data?.balances || [] }
  }

  async createReallocation(payload) {
    return this.client.post('/reallocations', payload)
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
