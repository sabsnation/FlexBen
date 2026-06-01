<template>
  <div v-if="open" class="panel-backdrop" @click="emit('close')" />
  <div v-if="open" class="notification-panel" role="dialog" aria-label="Notificações">
    <div class="panel-header">
      <h3>Notificações</h3>
      <button type="button" class="btn-icon" aria-label="Fechar" @click="emit('close')">
        <Icon name="x" :size="16" />
      </button>
    </div>

    <div class="panel-tabs">
      <button
        v-for="t in tabs"
        :key="t.id"
        type="button"
        class="tab-chip"
        :class="{ active: filter === t.id }"
        @click="filter = t.id"
      >
        {{ t.label }}
        <span v-if="t.id === 'unread' && unreadCount" class="tab-badge">{{ unreadCount }}</span>
      </button>
    </div>

    <div v-if="unreadCount" class="panel-actions">
      <button type="button" class="btn btn-ghost btn-sm" @click="handleMarkAll">
        Marcar todas como lidas
      </button>
    </div>

    <div v-if="loading" class="panel-empty muted">
      <Icon name="spinner" :size="16" class="spin" /> Carregando…
    </div>
    <div v-else-if="!visibleItems.length" class="panel-empty">
      <Icon name="inbox" :size="28" />
      <p>{{ emptyMessage }}</p>
    </div>
    <ul v-else class="notification-list">
      <li
        v-for="n in visibleItems"
        :key="n.id"
        class="notification-item"
        :class="{ unread: !n.read }"
        @click="handleClick(n)"
      >
        <span class="dot" :class="n.type" aria-hidden="true" />
        <div class="notification-body">
          <strong>{{ n.title }}</strong>
          <p>{{ n.message }}</p>
          <span class="muted text-xs">{{ formatWhen(n.createdAt) }}</span>
        </div>
        <span v-if="!n.read" class="unread-pill">Nova</span>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useNotifications } from '../notifications.js'
import Icon from './Icon.vue'

defineProps({
  open: { type: Boolean, default: false }
})
const emit = defineEmits(['close'])

const router = useRouter()
const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications()

const filter = ref('all')
const tabs = [
  { id: 'all', label: 'Todas' },
  { id: 'unread', label: 'Não lidas' },
  { id: 'read', label: 'Lidas' }
]

const visibleItems = computed(() => {
  if (filter.value === 'unread') return notifications.value.filter((n) => !n.read)
  if (filter.value === 'read') return notifications.value.filter((n) => n.read)
  return notifications.value
})

const emptyMessage = computed(() => {
  if (filter.value === 'unread') return 'Nenhuma notificação não lida.'
  if (filter.value === 'read') return 'Nenhuma notificação lida ainda.'
  return 'Você está em dia — sem notificações.'
})

const formatWhen = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

const handleMarkAll = async () => {
  await markAllRead()
}

const handleClick = async (n) => {
  try {
    if (!n.read) await markRead(n.id)
  } catch (err) {
    console.warn('[notifications] markRead:', err)
  }
  if (n.link) router.push(n.link)
  emit('close')
}
</script>

<style scoped>
.panel-backdrop {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: transparent;
}
.notification-panel {
  position: fixed;
  top: calc(var(--topbar-height, 72px) + 8px);
  right: 16px;
  width: min(380px, calc(100vw - 24px));
  max-height: min(520px, calc(100vh - 100px));
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-xl);
  z-index: 100;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1rem 0.5rem;
}
.panel-header h3 {
  margin: 0;
  font-size: 1rem;
}
.panel-tabs {
  display: flex;
  gap: 6px;
  padding: 0 1rem 0.75rem;
  flex-wrap: wrap;
}
.tab-chip {
  border: 1px solid var(--border-light);
  background: var(--surface-soft);
  border-radius: 999px;
  padding: 0.25rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--text-muted);
}
.tab-chip.active {
  background: var(--brand-primary-softer);
  border-color: var(--brand-primary);
  color: var(--brand-primary-dark);
}
.tab-badge {
  background: var(--brand-danger);
  color: white;
  border-radius: 999px;
  min-width: 18px;
  height: 18px;
  font-size: 0.65rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}
.panel-actions {
  padding: 0 1rem 0.5rem;
}
.panel-empty {
  padding: 2rem 1rem;
  text-align: center;
  color: var(--text-muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}
.notification-list {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  flex: 1;
}
.notification-item {
  display: flex;
  gap: 10px;
  padding: 0.85rem 1rem;
  border-top: 1px solid var(--border-light);
  cursor: pointer;
  transition: var(--transition);
  align-items: flex-start;
}
.notification-item:hover {
  background: var(--surface-soft);
}
.notification-item.unread {
  background: var(--brand-primary-softer);
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 6px;
  flex-shrink: 0;
  background: var(--brand-primary);
}
.dot.warning { background: var(--brand-warn); }
.dot.info { background: var(--brand-primary); }
.notification-body {
  flex: 1;
  min-width: 0;
}
.notification-body strong {
  display: block;
  font-size: 0.85rem;
  margin-bottom: 2px;
}
.notification-body p {
  margin: 0 0 4px;
  font-size: 0.8rem;
  color: var(--text-muted);
  line-height: 1.4;
}
.unread-pill {
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--brand-primary-dark);
  background: white;
  border: 1px solid var(--brand-primary);
  border-radius: 999px;
  padding: 2px 6px;
  flex-shrink: 0;
}
</style>
