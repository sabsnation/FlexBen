import { httpApiClient } from '../adapters/HttpApiClient.js'

export class AuthApiRepository {
  constructor(client = httpApiClient) {
    this.client = client
  }

  async login(email, senha) {
    return this.client.post('/auth/login', { email, senha })
  }

  async register(userData) {
    return this.client.post('/auth/register', userData)
  }

  async me() {
    return this.client.get('/auth/me')
  }

  async recoverPassword(email) {
    return this.client.post('/auth/recover', { email })
  }

  async updateProfile(payload) {
    return this.client.patch('/auth/profile', payload)
  }

  async changePassword(currentPassword, newPassword) {
    return this.client.patch('/auth/password', { currentPassword, newPassword })
  }
}

export const authRepository = new AuthApiRepository()
