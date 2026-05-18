<template>
  <div v-if="!isAuthenticated" class="auth-layout">
    <router-view />
  </div>

  <div v-else class="layout-wrapper">
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="brand-mark">CB</div>
        <div style="display: flex; flex-direction: column;">
          <span style="font-weight: 800; font-size: 1.05rem; line-height: 1.1;">CorpBenefit</span>
          <span style="font-size: 0.7rem; color: #94a3b8; font-weight: 500; letter-spacing: 0.06em;">FLEX 2026</span>
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
          >
            <span class="menu-icon">{{ item.icon }}</span>
            {{ item.label }}
          </RouterLink>
        </div>
      </nav>

      <div class="sidebar-footer">
        <div class="user-mini">
          <div class="avatar" :style="{ background: roleColor }">{{ initials }}</div>
          <div class="user-mini__info">
            <span class="user-mini__name">{{ user?.nome }}</span>
            <span class="user-mini__role">{{ roleLabel }}</span>
          </div>
        </div>
        <button @click="handleLogout" class="logout-btn" type="button">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Sair
        </button>
      </div>
    </aside>

    <main class="main-content">
      <header class="top-header">
        <div class="breadcrumb">
          <span>{{ sectionTitle }}</span>
          <span v-if="route.name && route.name !== 'Dashboard'" class="divider">/</span>
          <span v-if="route.name && route.name !== 'Dashboard'" class="current">{{ route.name }}</span>
        </div>

        <div class="user-profile">
          <div class="avatar" :style="{ background: roleColor }">{{ initials }}</div>
          <div style="display: flex; flex-direction: column; line-height: 1.1;">
            <span style="font-size: 0.85rem; font-weight: 700;">{{ user?.nome }}</span>
            <span style="font-size: 0.7rem; color: var(--text-muted); text-transform: capitalize;">{{ roleLabel }}</span>
          </div>
        </div>
      </header>

      <router-view />
    </main>
  </div>

  <Transition name="toast">
    <div v-if="toast.visible" class="toast-overlay" :class="toast.type">
      <div class="toast-content">
        <span style="font-size: 1.1rem;">
          <span v-if="toast.type === 'success'">✓</span>
          <span v-else-if="toast.type === 'error'">!</span>
          <span v-else>i</span>
        </span>
        <span>{{ toast.message }}</span>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { useAuth } from './auth'
import { useToast } from './toast'
import { useRouter, useRoute } from 'vue-router'
import { computed, onMounted } from 'vue'
import { getToken } from './api'
import { NAV_SECTIONS } from './config/navigation'

const { user, role, isAuthenticated, logout, refreshMe } = useAuth()
const { toast } = useToast()
const router = useRouter()
const route = useRoute()

onMounted(async () => {
  if (getToken()) {
    try {
      await refreshMe()
    } catch {
      logout()
      router.push('/login')
    }
  }
})

const handleLogout = () => {
  if (confirm('Deseja realmente sair?')) {
    logout()
    router.push('/login')
  }
}

const visibleSections = computed(() =>
  NAV_SECTIONS
    .filter((section) => section.roles.includes(role.value))
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.roles || item.roles.includes(role.value))
    }))
    .filter((section) => section.items.length > 0)
)

const sectionTitle = computed(() => {
  const found = visibleSections.value.find((s) => s.items.some((i) => i.to === route.path))
  return found ? found.title : 'Início'
})

const roleColor = computed(() => {
  if (role.value === 'administrador') return '#6366f1'
  if (role.value === 'gestor') return '#0ea5e9'
  if (role.value === 'financeiro') return '#f59e0b'
  return '#10b981'
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
</script>

<style scoped>
.brand-mark {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #6366f1 0%, #4338ca 100%);
  color: white;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  letter-spacing: -0.02em;
  box-shadow: 0 4px 14px -4px rgba(99, 102, 241, 0.6);
}

.user-mini {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0.6rem 0.7rem;
  background: rgba(255, 255, 255, 0.04);
  border-radius: var(--radius-sm);
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
  font-size: 0.7rem;
  color: #94a3b8;
}

.logout-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0.6rem 0.85rem;
  border-radius: var(--radius-sm);
  background: rgba(239, 68, 68, 0.15);
  color: #fca5a5;
  border: 1px solid rgba(239, 68, 68, 0.25);
  cursor: pointer;
  font-weight: 600;
  font-size: 0.82rem;
  transition: var(--transition);
}
.logout-btn:hover { background: rgba(239, 68, 68, 0.25); color: #fecaca; }
</style>
