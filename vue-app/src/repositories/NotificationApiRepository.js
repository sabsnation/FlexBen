import { httpApiClient } from '../adapters/HttpApiClient.js'

export class NotificationApiRepository {
  constructor(client = httpApiClient) {
    this.client = client
  }

  async list() {
    return this.client.get('/notifications')
  }

  async markRead(id) {
    return this.client.patch(`/notifications/${id}/read`, {})
  }

  async markAllRead() {
    return this.client.patch('/notifications/read-all', {})
  }
}

export const notificationRepository = new NotificationApiRepository()
