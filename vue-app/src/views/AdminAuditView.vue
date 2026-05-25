<template>
  <div class="container">
    <PageHeader
      title="Auditoria"
      subtitle="Eventos importantes registrados em banco NoSQL (Firestore / MongoDB). Sem credenciais, a lista fica vazia."
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
        Nenhuma credencial NoSQL no <code>backend/.env</code>. Configure um dos provedores:
        Firebase (<code>FIREBASE_SERVICE_ACCOUNT</code> JSON em 1 linha) ou
        MongoDB (<code>MONGODB_URI</code>). Use também <code>AUDIT_PROVIDER</code> para fixar.
      </span>
    </div>
    <div v-else-if="!firestoreEnabled && firebaseInitError" class="notice danger">
      <Icon class="notice-icon" name="alert-circle" :size="18" />
      <span>
        Credencial configurada, mas o Firestore não iniciou: <strong>{{ firebaseInitError }}</strong>.
        Confira o JSON, o caminho do arquivo e se o Firestore está criado no projeto Firebase.
      </span>
    </div>

    <div class="grid cols-3 mb-3">
      <KpiCard label="Eventos exibidos" :value="filtered.length" tone="info" icon="list" />
      <KpiCard label="Total recebido" :value="events.length" icon="activity" />
      <KpiCard
        label="Provider NoSQL"
        :value="firestoreEnabled ? 'ativo' : 'desligado'"
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
            <input v-model="search" type="text" placeholder="ex.: APPROVAL_DECISION ou admin@..." />
          </div>
        </div>
        <div class="form-group">
          <label>Módulo</label>
          <select v-model="moduleFilter">
            <option value="">Todos</option>
            <option v-for="m in modulesOptions" :key="m" :value="m">{{ m }}</option>
          </select>
        </div>
      </div>
    </div>

    <div v-if="loading" class="card text-center muted">
      <Icon name="spinner" :size="16" class="spin" /> Carregando eventos…
    </div>

    <div v-else-if="!filtered.length" class="card">
      <EmptyState icon="shield" title="Nenhum evento" message="Nenhum evento corresponde aos filtros." />
    </div>

    <div v-else class="table-wrapper scrollable">
      <table>
        <thead>
          <tr>
            <th>Data/Hora</th>
            <th>Ação</th>
            <th>Ator</th>
            <th>Módulo</th>
            <th>Detalhe</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="ev in filtered" :key="ev.id">
            <td class="muted nowrap">{{ formatDate(ev.createdAt) }}</td>
            <td><span class="badge badge-info">{{ ev.action }}</span></td>
            <td><strong>{{ ev.actorEmail }}</strong></td>
            <td>{{ ev.payload?.module || '—' }}</td>
            <td style="max-width: 360px;">
              <code class="payload">{{ JSON.stringify(ev.payload || {}, null, 0) }}</code>
            </td>
          </tr>
        </tbody>
      </table>
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
const loading = ref(true)
const search = ref('')
const moduleFilter = ref('')
const { showToast } = useToast()

const reload = async () => {
  loading.value = true
  try {
    const data = await api.get('/admin/audit')
    events.value = data.events || []
    firestoreEnabled.value = !!data.firestoreEnabled || !!data.ready
    credentialConfigured.value = !!data.credentialConfigured
    firebaseInitError.value = data.firebaseInitError || null
  } catch (e) {
    showToast(e.message, 'error')
  } finally {
    loading.value = false
  }
}

onMounted(reload)

const modulesOptions = computed(() => {
  const mods = new Set()
  events.value.forEach((e) => {
    if (e.payload?.module) mods.add(e.payload.module)
  })
  return [...mods].sort()
})

const filtered = computed(() => {
  const search_term = search.value.trim().toLowerCase()
  return events.value.filter((e) => {
    const matchesSearch =
      !search_term ||
      (e.action || '').toLowerCase().includes(search_term) ||
      (e.actorEmail || '').toLowerCase().includes(search_term)
    const matchesModule = !moduleFilter.value || e.payload?.module === moduleFilter.value
    return matchesSearch && matchesModule
  })
})

const formatDate = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('pt-BR')
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
.payload {
  display: block;
  white-space: pre-wrap;
  word-break: break-all;
  background: var(--surface-soft);
  padding: 0.45rem 0.7rem;
  border-radius: var(--radius-xs);
  font-size: 0.75rem;
  color: var(--text-strong);
  font-family: var(--font-mono);
}
</style>
