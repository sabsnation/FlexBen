import { httpApiClient } from '../adapters/HttpApiClient.js'

export class UserApiRepository {
  constructor(client = httpApiClient) {
    this.client = client
  }

  async list() {
    const { users } = await this.client.get('/users')
    return users
  }

  async invite(payload) {
    const { user } = await this.client.post('/users', payload)
    return user
  }

  async toggleStatus(id) {
    const { user } = await this.client.patch(`/users/${id}/status`, {})
    return user
  }

  async remove(id) {
    await this.client.delete(`/users/${id}`)
  }
}

export const userRepository = new UserApiRepository()
