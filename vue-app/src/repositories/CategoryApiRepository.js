import { httpApiClient } from '../adapters/HttpApiClient.js'

export class CategoryApiRepository {
  constructor(client = httpApiClient) {
    this.client = client
  }

  async list() {
    const { categories } = await this.client.get('/categories')
    return categories
  }

  async create(payload) {
    const { category } = await this.client.post('/categories', payload)
    return category
  }

  async remove(id) {
    await this.client.delete(`/categories/${id}`)
  }
}

export const categoryRepository = new CategoryApiRepository()
