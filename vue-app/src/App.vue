<template>
  <div v-if="!isAuthenticated" class="auth-layout">
    <router-view />
  </div>

  <div v-else class="layout-wrapper">
    <div
      v-if="isMobileLayout && sidebarOpen"
      class="sidebar-backdrop is-visible"
      aria-hidden="true"
      @click="closeSidebar"
    />

    <aside class="sidebar" :class="{ 'sidebar--open': sidebarOpen }">
      <div class="sidebar-header">
        <div class="brand-mark">FB</div>
        <div class="sidebar-brand">
          <span class="sidebar-brand__name">FlexBen</span>
          <span class="sidebar-brand__tag">FLEX · 2026</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <div v-for="section in visibleSections" :key="section.id" class="menu-group">
          <div class="section-title">{{ section.title }}</div>
          <RouterLink
            v-for="item in section.items"
            :key="item.to"
            :to="item.to"
            class="sidebar-link"
            @click="closeSidebar"
          >
            <span class="menu-icon">
              <Icon :name="item.icon" :size="16" :stroke-width="2" />
            </span>
            {{ item.label }}
          </RouterLink>
        </div>
      </nav>

      <div class="sidebar-footer">
        <div class="user-mini">
          <div class="avatar sm" :style="{ background: roleColor }">{{ initials }}</div>
          <div class="user-mini__info">
            <span class="user-mini__name">{{ user?.nome }}</span>
            <span class="user-mini__role">{{ roleLabel }}</span>
          </div>
        </div>
        <button @click="handleLogout" class="logout-btn" type="button">
          <Icon name="logout" :size="14" />
          Sair
        </button>
      </div>
    </aside>

    <main class="main-content">
      <header class="top-header">
        <div class="top-header-left">
          <button
            v-if="isMobileLayout"
            class="menu-toggle-btn"
            type="button"
            :aria-expanded="sidebarOpen"
            aria-label="Abrir menu de navegação"
            @click="toggleSidebar"
          >
            <Icon name="menu" :size="18" />
          </button>
          <div class="breadcrumb">
          <span>{{ sectionTitle }}</span>
          <span v-if="currentLabel && currentLabel !== sectionTitle" class="divider">/</span>
          <span v-if="currentLabel && currentLabel !== sectionTitle" class="current">{{ currentLabel }}</span>
          </div>
        </div>

        <div class="topbar-right">
          <button
            type="button"
            class="icon-btn"
            aria-label="Notificações"
            :aria-expanded="notificationsOpen"
            @click="toggleNotifications"
          >
            <Icon name="bell" :size="18" />
            <span v-if="unreadCount" class="notif-badge">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
          </button>

          <button type="button" class="user-profile user-profile--btn" @click="profileOpen = true">
            <div class="avatar" :style="topAvatarStyle">
              <img v-if="user?.avatarData" :src="user.avatarData" alt="" class="avatar-img" />
              <span v-else>{{ initials }}</span>
            </div>
            <div class="user-profile__info hide-mobile">
              <span class="user-profile__name">{{ user?.nome }}</span>
              <span class="user-profile__role">{{ roleLabel }}</span>
            </div>
          </button>
        </div>
      </header>

      <router-view />
    </main>
  </div>

  <NotificationPanel :open="notificationsOpen" @close="notificationsOpen = false" />
  <ProfilePanel :open="profileOpen" @close="profileOpen = false" />

  <ConfirmDialog />

  <Transition name="toast">
    <div v-if="toast.visible" class="toast-overlay" :class="toast.type">
      <span class="toast-icon">
        <Icon
          :name="toast.type === 'success' ? 'check' : toast.type === 'error' ? 'alert-circle' : 'info'"
          :size="16"
        />
      </span>
      <span>{{ toast.message }}</span>
    </div>
  </Transition>
</template>

<script setup>
import { useAuth } from './auth'
import { useToast } from './toast'
import { useConfirm } from './confirm'
import ConfirmDialog from './components/ConfirmDialog.vue'
import { useRouter, useRoute } from 'vue-router'
import { computed, onMounted, ref, watch } from 'vue'
import { getToken } from './api'
import { NAV_SECTIONS } from './config/navigation'
import { useBreakpoint } from './composables/useBreakpoint.js'
import Icon from './components/Icon.vue'
import NotificationPanel from './components/NotificationPanel.vue'
import ProfilePanel from './components/ProfilePanel.vue'
import { useNotifications } from './notifications.js'

const { user, role, isAuthenticated, logout, refreshMe, can } = useAuth()
const { unreadCount, load: loadNotifications } = useNotifications()
const { isMobileLayout } = useBreakpoint()
const { toast } = useToast()
const { confirm } = useConfirm()
const router = useRouter()
const route = useRoute()

const sidebarOpen = ref(false)
const notificationsOpen = ref(false)
const profileOpen = ref(false)

const toggleNotifications = async () => {
  notificationsOpen.value = !notificationsOpen.value
  if (notificationsOpen.value) {
    await loadNotifications()
  }
}
const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value
}
const closeSidebar = () => {
  sidebarOpen.value = false
}

watch(
  () => route.path,
  () => closeSidebar()
)

watch(isMobileLayout, (mobile) => {
  if (!mobile) closeSidebar()
})

onMounted(async () => {
  if (getToken()) {
    try {
      await refreshMe()
      await loadNotifications()
    } catch {
      logout()
      router.push('/login')
    }
  }
})

const handleLogout = async () => {
  const ok = await confirm({
    title: 'Sair da conta',
    message: 'Deseja encerrar sua sessão no FlexBen?',
    confirmLabel: 'Sair',
    cancelLabel: 'Continuar',
    variant: 'warning'
  })
  if (!ok) return
  logout()
  router.push('/login')
}

const visibleSections = computed(() =>
  NAV_SECTIONS
    .filter((section) => section.roles.includes(role.value))
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (item.roles && !item.roles.includes(role.value)) return false
        if (item.capability && !can(item.capability)) return false
        return true
      })
    }))
    .filter((section) => section.items.length > 0)
)

const currentItem = computed(() => {
  for (const section of visibleSections.value) {
    const found = section.items.find((i) => i.to === route.path)
    if (found) return { section, item: found }
  }
  return null
})

const sectionTitle = computed(() => currentItem.value?.section.title || 'Início')
const currentLabel = computed(() => currentItem.value?.item.label || (route.name || ''))

const roleColor = computed(() => {
  if (role.value === 'administrador') return 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)'
  if (role.value === 'gestor') return 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)'
  if (role.value === 'financeiro') return 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
  return 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
})

const roleLabel = computed(() => {
  const map = {
    colaborador: 'Colaborador',
    gestor: 'Gestor',
    administrador: 'RH / Admin',
    financeiro: 'Financeiro'
  }
  return map[role.value] || role.value
})

const initials = computed(() => {
  const u = user.value
  if (!u) return '?'
  if (u.initials) return u.initials
  return (u.nome || u.email || '?').slice(0, 1).toUpperCase()
})

const topAvatarStyle = computed(() => {
  if (user.value?.avatarData) return {}
  return { background: roleColor.value }
})
</script>

<style scoped>
.brand-mark {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #6366f1 0%, #4338ca 100%);
  color: white;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 1rem;
  letter-spacing: -0.02em;
  box-shadow: 0 8px 20px -8px rgba(99, 102, 241, 0.7);
  flex-shrink: 0;
}

.sidebar-brand {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
  min-width: 0;
}
.sidebar-brand__name {
  color: white;
  font-weight: 800;
  font-size: 1.05rem;
  letter-spacing: -0.01em;
}
.sidebar-brand__tag {
  color: #94a3b8;
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  margin-top: 2px;
}

.user-mini {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0.6rem 0.7rem;
  background: rgba(255, 255, 255, 0.04);
  border-radius: var(--radius-sm);
  border: 1px solid rgba(255, 255, 255, 0.04);
  margin-bottom: 0.6rem;
}
.user-mini__info { display: flex; flex-direction: column; line-height: 1.15; min-width: 0; flex: 1; }
.user-mini__name {
  color: white;
  font-size: 0.82rem;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.user-mini__role {
  font-size: 0.68rem;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
  margin-top: 1px;
}

.logout-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0.65rem 0.85rem;
  border-radius: var(--radius-sm);
  background: rgba(239, 68, 68, 0.12);
  color: #fca5a5;
  border: 1px solid rgba(239, 68, 68, 0.22);
  cursor: pointer;
  font-weight: 600;
  font-size: 0.82rem;
  font-family: inherit;
  transition: var(--transition);
}
.logout-btn:hover {
  background: rgba(239, 68, 68, 0.22);
  color: #fecaca;
  border-color: rgba(239, 68, 68, 0.35);
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.topbar-btn {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  background: var(--surface);
  border: 1px solid var(--border-light);
  color: var(--text-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: var(--transition);
  box-shadow: var(--shadow-sm);
}
.topbar-btn:hover {
  color: var(--text-strong);
  border-color: var(--border-strong);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.icon-btn {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  background: var(--surface);
  border: 1px solid var(--border-light);
  color: var(--text-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: var(--transition);
  box-shadow: var(--shadow-sm);
}
.icon-btn:hover {
  color: var(--brand-primary);
  border-color: var(--brand-primary);
}
.notif-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--brand-danger);
  color: white;
  font-size: 0.65rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--surface);
}
.user-profile--btn {
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  padding: 0;
  border-radius: var(--radius-sm);
  transition: var(--transition);
}
.user-profile--btn:hover {
  opacity: 0.92;
}
.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: inherit;
}

.user-profile__info {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
  min-width: 0;
}
.user-profile__name {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-strong);
  white-space: nowrap;
}
.user-profile__role {
  font-size: 0.68rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
  margin-top: 1px;
}
</style>
