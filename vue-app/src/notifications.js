import { reactive, computed } from 'vue'
import { notificationRepository } from './repositories/NotificationApiRepository.js'

const state = reactive({
  items: [],
  unreadCount: 0,
  loading: false
})

export const useNotifications = () => {
  const load = async () => {
    state.loading = true
    try {
      const data = await notificationRepository.list()
      state.items = data.notifications || []
      state.unreadCount = data.unreadCount ?? state.items.filter((n) => !n.read).length
    } finally {
      state.loading = false
    }
  }

  const markRead = async (id) => {
    const { notification } = await notificationRepository.markRead(id)
    state.items = state.items.map((n) => (n.id === id ? notification : n))
    state.unreadCount = state.items.filter((n) => !n.read).length
  }

  const markAllRead = async () => {
    await notificationRepository.markAllRead()
    state.items = state.items.map((n) => ({ ...n, read: true }))
    state.unreadCount = 0
  }

  return {
    notifications: computed(() => state.items),
    unreadCount: computed(() => state.unreadCount),
    loading: computed(() => state.loading),
    load,
    markRead,
    markAllRead
  }
}
