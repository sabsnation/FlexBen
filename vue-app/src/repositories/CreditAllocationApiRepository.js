import { httpApiClient } from '../adapters/HttpApiClient.js'

export class CreditAllocationApiRepository {
  constructor(client = httpApiClient) {
    this.client = client
  }

  async listEligibleUsers() {
    const { users } = await this.client.get('/credits/eligible-users')
    return users
  }

  async getUserBalances(userId) {
    return this.client.get(`/credits/users/${userId}/balances`)
  }

  async allocate(payload) {
    return this.client.post('/credits/allocate', payload)
  }
}

export const creditAllocationRepository = new CreditAllocationApiRepository()
