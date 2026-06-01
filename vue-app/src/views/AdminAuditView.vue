<template>
  <div class="container">
    <PageHeader
      title="Auditoria"
      subtitle="Trilha imutável de eventos críticos (Firestore ou MongoDB)."
      eyebrow="Governança"
    >
      <template #actions>
        <button class="btn btn-secondary" type="button" @click="reload" :disabled="loading">
          <Icon :name="loading ? 'spinner' : 'refresh'" :size="14" :class="loading ? 'spin' : ''" />
          Atualizar
        </button>
      </template>
    </PageHeader>

    <div v-if="!credentialConfigured" class="notice warning">
      <Icon class="notice-icon" name="alert-triangle" :size="18" />
      <span>
        Nenhuma credencial NoSQL no <code>backend/.env</code>. Configure Firebase ou MongoDB e
        <code>AUDIT_PROVIDER</code>.
      </span>
    </div>
    <div v-else-if="!firestoreEnabled && firebaseInitError" class="notice danger">
      <Icon class="notice-icon" name="alert-circle" :size="18" />
      <span>
        Credencial configurada, mas o provider não iniciou:
        <strong>{{ firebaseInitError }}</strong>
      </span>
    </div>

    <div class="grid cols-3 mb-3">
      <KpiCard label="Eventos filtrados" :value="filtered.length" tone="info" icon="filter" />
      <KpiCard label="Total no log" :value="events.length" icon="list" />
      <KpiCard
        label="Provider"
        :value="providerLabel"
        :tone="firestoreEnabled ? 'success' : 'warning'"
        icon="shield"
      />
    </div>

    <div class="card mb-3">
      <h3 class="card-title">
        <span class="title-with-icon">
          <span class="icon-bg sm"><Icon name="filter" :size="14" /></span>
          Filtros
        </span>
      </h3>
      <div class="form-row">
        <div class="form-group">
          <label>Buscar ação ou ator</label>
          <div class="input-wrap">
            <Icon name="search" :size="14" class="input-icon" />
            <input v-model="search" type="text" placeholder="ex.: USER_CREATED ou admin@..." />
          </div>
        </div>
        <div class="form-group">
          <label>Módulo</label>
          <select v-model="moduleFilter">
            <option value="">Todos</option>
            <option v-for="m in modulesOptions" :key="m" :value="m">{{ moduleLabel(m) }}</option>
          </select>
        </div>
      </div>
    </div>

    <div v-if="loading" class="card text-center muted" style="padding: 2rem;">
      <Icon name="spinner" :size="16" class="spin" /> Carregando eventos…
    </div>

    <div v-else-if="!filtered.length" class="card">
      <EmptyState icon="shield" title="Nenhum evento" message="Nenhum evento corresponde aos filtros ou o log está vazio." />
    </div>

    <div v-else class="audit-list">
      <article v-for="ev in filtered" :key="ev.id" class="audit-card">
        <header class="audit-card__head">
          <div>
            <span class="badge" :class="outcomeBadge(ev.outcome)">{{ actionLabel(ev.action) }}</span>
            <span class="muted text-xs audit-id">#{{ shortId(ev.id) }}</span>
          </div>
          <time class="muted text-xs">{{ formatDate(ev.createdAt) }}</time>
        </header>
        <div class="audit-card__meta">
          <span><Icon name="user" :size="12" /> {{ ev.actorEmail || 'system' }}</span>
          <span><Icon name="grid" :size="12" /> {{ moduleLabel(ev.module) }}</span>
          <span v-if="ev.entityId"><Icon name="file-text" :size="12" /> ID {{ ev.entityId }}</span>
        </div>
        <p class="audit-summary">{{ eventSummary(ev) }}</p>
        <details v-if="hasExtraPayload(ev)" class="audit-details">
          <summary>Ver payload técnico</summary>
          <pre>{{ formatPayload(ev) }}</pre>
        </details>
      </article>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '../api'
import { useToast } from '../toast'
import PageHeader from '../components/PageHeader.vue'
import KpiCard from '../components/KpiCard.vue'
import EmptyState from '../components/EmptyState.vue'
import Icon from '../components/Icon.vue'

const events = ref([])
const firestoreEnabled = ref(false)
const credentialConfigured = ref(false)
const firebaseInitError = ref(null)
const provider = ref('')
const loading = ref(true)
const search = ref('')
const moduleFilter = ref('')
const { showToast } = useToast()

const ACTION_LABELS = {
  USER_CREATED_BY_ADMIN: 'Usuário criado (admin)',
  USER_REGISTER: 'Cadastro de usuário',
  USER_STATUS_CHANGE: 'Status de usuário',
  USER_DELETE: 'Usuário removido',
  TRANSACTION_CREATE: 'Transação criada',
  APPROVAL_DECISION: 'Decisão de aprovação',
  MONTHLY_LOAD: 'Carga mensal',
  CEILING_PROPOSAL: 'Proposta de teto',
  POLICY_UPDATE: 'Política atualizada',
  CLOSING_RUN: 'Fechamento financeiro'
}

const MODULE_LABELS = {
  auth: 'Autenticação',
  users: 'Usuários',
  transactions: 'Transações',
  workflow: 'Workflow',
  policies: 'Políticas',
  finance: 'Financeiro',
  ceilings: 'Tetos',
  geral: 'Geral'
}

const actionLabel = (code) => ACTION_LABELS[code] || code || '—'
const moduleLabel = (code) => MODULE_LABELS[code] || code || '—'

const reload = async () => {
  loading.value = true
  try {
    const data = await api.get('/admin/audit')
    events.value = data.events || []
    firestoreEnabled.value = !!data.firestoreEnabled || !!data.ready
    credentialConfigured.value = !!data.credentialConfigured
    firebaseInitError.value = data.firebaseInitError || null
    provider.value = data.provider || ''
    showToast('Auditoria atualizada.')
  } catch (e) {
    showToast(e.message, 'error')
  } finally {
    loading.value = false
  }
}

const initialLoad = async () => {
  loading.value = true
  try {
    const data = await api.get('/admin/audit')
    events.value = data.events || []
    firestoreEnabled.value = !!data.firestoreEnabled || !!data.ready
    credentialConfigured.value = !!data.credentialConfigured
    firebaseInitError.value = data.firebaseInitError || null
    provider.value = data.provider || ''
  } catch (e) {
    showToast(e.message, 'error')
  } finally {
    loading.value = false
  }
}

onMounted(initialLoad)

const providerLabel = computed(() => {
  if (firestoreEnabled.value) return provider.value || 'ativo'
  return 'desligado'
})

const modulesOptions = computed(() => {
  const mods = new Set()
  events.value.forEach((e) => {
    if (e.module) mods.add(e.module)
  })
  return [...mods].sort()
})

const filtered = computed(() => {
  const search_term = search.value.trim().toLowerCase()
  return events.value.filter((e) => {
    const matchesSearch =
      !search_term ||
      (e.action || '').toLowerCase().includes(search_term) ||
      (e.actorEmail || '').toLowerCase().includes(search_term) ||
      actionLabel(e.action).toLowerCase().includes(search_term)
    const matchesModule = !moduleFilter.value || e.module === moduleFilter.value
    return matchesSearch && matchesModule
  })
})

const formatDate = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('pt-BR')
}

const shortId = (id) => (id ? String(id).slice(0, 8) : '—')

const outcomeBadge = (outcome) => {
  if (outcome === 'error' || outcome === 'failure') return 'badge-danger'
  if (outcome === 'warning') return 'badge-warning'
  return 'badge-success'
}

const eventSummary = (ev) => {
  const p = ev.payload || {}
  const parts = []
  if (p.userId) parts.push(`usuário #${p.userId}`)
  if (p.transactionId) parts.push(`transação #${p.transactionId}`)
  if (p.role) parts.push(`perfil ${p.role}`)
  if (p.status) parts.push(`status ${p.status}`)
  if (p.decision) parts.push(`decisão: ${p.decision}`)
  if (parts.length) return parts.join(' · ')
  return 'Evento registrado no log de auditoria.'
}

const EXTRA_KEYS = new Set(['module', 'entityId', 'outcome'])

const hasExtraPayload = (ev) => {
  const p = ev.payload || {}
  return Object.keys(p).some((k) => !EXTRA_KEYS.has(k))
}

const formatPayload = (ev) => {
  const p = { ...(ev.payload || {}) }
  delete p.module
  delete p.entityId
  delete p.outcome
  return JSON.stringify(p, null, 2)
}
</script>

<style scoped>
.title-with-icon { display: inline-flex; align-items: center; gap: 10px; }
.input-wrap { position: relative; }
.input-wrap input { padding-left: 2.25rem; }
.input-icon {
  position: absolute;
  top: 50%;
  left: 10px;
  transform: translateY(-50%);
  color: var(--text-subtle);
  pointer-events: none;
}
.audit-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.audit-card {
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  padding: 1rem 1.1rem;
  box-shadow: var(--shadow-sm);
}
.audit-card__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}
.audit-id { margin-left: 6px; }
.audit-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
}
.audit-card__meta span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.audit-summary {
  margin: 0;
  font-size: 0.88rem;
  color: var(--text-strong);
  line-height: 1.45;
}
.audit-details {
  margin-top: 0.65rem;
  font-size: 0.8rem;
}
.audit-details summary {
  cursor: pointer;
  color: var(--brand-primary);
  font-weight: 600;
}
.audit-details pre {
  margin: 0.5rem 0 0;
  padding: 0.65rem;
  background: var(--surface-soft);
  border-radius: var(--radius-xs);
  font-size: 0.72rem;
  overflow-x: auto;
  font-family: var(--font-mono);
}
</style>
