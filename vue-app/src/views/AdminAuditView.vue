<template>
  <div class="container">
    <PageHeader
      title="Auditoria"
      subtitle="Eventos importantes registrados em banco NoSQL (Firestore). Sem credenciais, a lista fica vazia."
    >
      <template #actions>
        <button class="btn btn-secondary" type="button" @click="reload">↻ Atualizar</button>
      </template>
    </PageHeader>

    <div v-if="!credentialConfigured" class="notice warning">
      <span>⚠</span>
      <span>
        Nenhuma credencial Firebase no <code>backend/.env</code>. Use uma das opções:
        <code>FIREBASE_SERVICE_ACCOUNT</code> (JSON em uma linha),
        <code>FIREBASE_SERVICE_ACCOUNT_PATH</code> (ex.: <code>./firebase-service-account.json</code>)
        ou <code>GOOGLE_APPLICATION_CREDENTIALS</code> (caminho do JSON da service account).
      </span>
    </div>
    <div v-else-if="!firestoreEnabled && firebaseInitError" class="notice danger">
      <span>!</span>
      <span>
        Credencial configurada, mas o Firestore não iniciou: <strong>{{ firebaseInitError }}</strong>
        Confira o JSON, o caminho do arquivo e se o Firestore está criado no projeto Firebase.
      </span>
    </div>

    <div class="grid cols-3 mb-3">
      <KpiCard label="Eventos exibidos" :value="filtered.length" tone="info" />
      <KpiCard label="Total recebido" :value="events.length" />
      <KpiCard label="Firestore" :value="firestoreEnabled ? 'ativo' : 'desligado'" :tone="firestoreEnabled ? 'success' : 'warning'" />
    </div>

    <div class="card mb-3">
      <h3 class="card-title">Filtros</h3>
      <div class="form-row">
        <div class="form-group">
          <label>Buscar ação ou ator</label>
          <input v-model="search" type="text" placeholder="ex.: APPROVAL_DECISION ou admin@..." />
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

    <div v-if="loading" class="card text-center muted">Carregando eventos…</div>

    <div v-else-if="!filtered.length" class="card">
      <EmptyState icon="⎘" title="Nenhum evento" message="Nenhum evento corresponde aos filtros." />
    </div>

    <div v-else class="table-wrapper">
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
            <td class="muted" style="white-space: nowrap;">{{ formatDate(ev.createdAt) }}</td>
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
    firestoreEnabled.value = !!data.firestoreEnabled
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
.payload {
  display: block;
  white-space: pre-wrap;
  word-break: break-all;
  background: var(--surface-soft);
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  font-size: 0.78rem;
  color: var(--text-strong);
}
</style>
