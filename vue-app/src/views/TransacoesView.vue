<template>
  <div class="container">
    <PageHeader
      title="Histórico de movimentações"
      subtitle="Créditos, realocações e utilizações do seu benefício flex interno."
    >
      <template #actions>
        <button class="btn btn-secondary" @click="exportCSV">
          <Icon name="download" :size="14" /> Exportar CSV
        </button>
      </template>
    </PageHeader>

    <KpiSkeleton v-if="pageLoading" />
    <div v-else class="grid cols-4 mb-3">
      <KpiCard label="Total registrado" :value="filteredTransactions.length" tone="info" icon="list" :hint="`de ${transactions.length} no total`" />
      <KpiCard label="Total créditos" :value="totalIn" format="currency" tone="success" icon="arrow-down" />
      <KpiCard label="Total saídas" :value="totalOut" format="currency" tone="warning" icon="arrow-up" />
      <KpiCard label="Saldo período" :value="totalIn - totalOut" format="currency" :tone="(totalIn - totalOut) >= 0 ? 'success' : 'danger'" icon="dollar-sign" />
    </div>

    <div class="card mb-3">
      <h3 class="card-title">
        <span class="title-with-icon">
          <span class="icon-bg sm"><Icon name="filter" :size="14" /></span>
          Filtros
        </span>
        <button v-if="hasFilters" class="btn-link" type="button" @click="clearFilters">Limpar tudo</button>
      </h3>

      <div class="form-row">
        <div class="form-group">
          <label>Buscar</label>
          <div class="input-wrap">
            <Icon name="search" :size="14" class="input-icon" />
            <input type="text" v-model="filters.search" placeholder="Descrição ou categoria…" />
          </div>
        </div>
        <div class="form-group">
          <label>Tipo</label>
          <select v-model="filters.type">
            <option value="">Todos</option>
            <option value="Entrada">Entradas (créditos)</option>
            <option value="Saída">Saídas (débitos)</option>
          </select>
        </div>
        <div class="form-group">
          <label>Categoria</label>
          <select v-model="filters.category">
            <option value="">Todas</option>
            <option v-for="c in categoryNames" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>Status</label>
          <select v-model="filters.status">
            <option value="">Todos</option>
            <option value="Em análise">Em análise</option>
            <option value="Aprovado">Aprovado</option>
            <option value="Reprovado">Reprovado</option>
            <option value="Liquidado">Liquidado</option>
            <option value="Concluída">Concluída</option>
          </select>
        </div>
        <div class="form-group">
          <label>Data inicial</label>
          <input v-model="filters.dateFrom" type="date" />
        </div>
        <div class="form-group">
          <label>Data final</label>
          <input v-model="filters.dateTo" type="date" />
        </div>
      </div>
    </div>

    <TableSkeleton v-if="pageLoading" :rows="8" />

    <div v-else-if="displayedTransactions.length === 0" class="card">
      <EmptyState
        icon="inbox"
        title="Nenhuma transação encontrada"
        message="Ajuste os filtros ou registre uma nova movimentação."
      />
    </div>

    <div v-else class="table-wrapper scrollable">
      <table>
        <thead>
          <tr>
            <th class="th-sortable" @click="toggleSort('data')">
              Data <Icon :name="sortIcon('data')" :size="12" class="sort-icon" />
            </th>
            <th>Descrição</th>
            <th class="th-sortable" @click="toggleSort('tipo')">
              Tipo <Icon :name="sortIcon('tipo')" :size="12" class="sort-icon" />
            </th>
            <th>Categoria</th>
            <th class="th-sortable" @click="toggleSort('valor')">
              Valor <Icon :name="sortIcon('valor')" :size="12" class="sort-icon" />
            </th>
            <th class="th-sortable" @click="toggleSort('status')">
              Status <Icon :name="sortIcon('status')" :size="12" class="sort-icon" />
            </th>
            <th style="width: 1%;">Ações</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="item in displayedTransactions" :key="item.id">
            <tr>
              <td class="muted nowrap">{{ item.data }}</td>
              <td><strong>{{ item.descricao || '—' }}</strong></td>
              <td><StatusBadge :status="item.tipo" /></td>
              <td>{{ item.categoria }}</td>
              <td :class="['amount', item.tipo === 'Entrada' ? 'in' : 'out']">
                {{ item.tipo === 'Saída' ? '−' : '+' }} {{ formatCurrency(item.valor) }}
              </td>
              <td><StatusBadge :status="item.status" /></td>
              <td>
                <div class="actions" style="gap: 4px;">
                  <button
                    class="btn-icon"
                    :class="{ primary: workflow.transactionId === item.id && workflow.open }"
                    @click="openWorkflow(item.id)"
                    :title="workflow.transactionId === item.id && workflow.open ? 'Fechar fluxo' : 'Ver fluxo'"
                  >
                    <Icon :name="workflow.transactionId === item.id && workflow.open ? 'chevron-up' : 'eye'" :size="14" />
                  </button>
                  <button class="btn-icon danger" @click="handleDelete(item.id)" title="Excluir">
                    <Icon name="trash" :size="14" />
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="workflow.open && workflow.transactionId === item.id">
              <td colspan="7" class="workflow-cell">
                <div v-if="workflow.loading" class="muted text-center" style="padding: 1rem;">
                  <Icon name="spinner" :size="14" class="spin" /> Carregando trilha…
                </div>
                <div v-else-if="workflow.events.length === 0" class="muted text-center" style="padding: 1rem;">
                  Sem eventos de workflow registrados.
                </div>
                <div v-else class="timeline" style="padding: 0.5rem 0 0.5rem 24px;">
                  <div v-for="event in workflow.events" :key="event.id" class="timeline-item">
                    <div class="timeline-dot" :style="{ background: dotColor(event.toStatus) }"></div>
                    <div class="timeline-content">
                      <div class="event-row">
                        <div>
                          <strong>{{ event.fromStatus || 'Iniciado' }} → {{ event.toStatus }}</strong>
                          <div class="muted" style="margin-top: 2px; font-size: 0.78rem;">por {{ event.actorEmail }}</div>
                          <div v-if="event.note" style="margin-top: 4px; font-size: 0.85rem;">{{ event.note }}</div>
                        </div>
                        <div class="muted nowrap text-xs">{{ formatDate(event.createdAt) }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed, onMounted, ref } from 'vue'
import { useTransactions } from '../transactions'
import { useRouteQuerySync } from '../composables/useRouteQuerySync.js'
import { inDateRange, sortRows, downloadCsv } from '../services/listUtils.js'
import { useCategories } from '../categories'
import { useToast } from '../toast'
import { useConfirm } from '../confirm'
import PageHeader from '../components/PageHeader.vue'
import KpiCard from '../components/KpiCard.vue'
import StatusBadge from '../components/StatusBadge.vue'
import EmptyState from '../components/EmptyState.vue'
import KpiSkeleton from '../components/KpiSkeleton.vue'
import TableSkeleton from '../components/TableSkeleton.vue'
import Icon from '../components/Icon.vue'

const pageLoading = ref(true)
const { transactions, deleteTransaction, loadMine, getWorkflowHistory } = useTransactions()
const { showToast } = useToast()
const { confirm } = useConfirm()
const { categories, loadCategories } = useCategories()

onMounted(async () => {
  pageLoading.value = true
  try {
    const results = await Promise.allSettled([loadMine(), loadCategories()])
    const failed = results.find((r) => r.status === 'rejected')
    if (failed) {
      showToast(failed.reason?.message || 'Falha ao carregar transações.', 'error')
    }
  } finally {
    pageLoading.value = false
  }
})

const categoryNames = computed(() => [...new Set(categories.value.map((c) => c.nome))].sort())

const filters = reactive({ search: '', type: '', category: '', status: '', dateFrom: '', dateTo: '' })
const sort = reactive({ key: 'data', dir: 'desc' })
const workflow = reactive({ open: false, loading: false, transactionId: null, events: [] })

useRouteQuerySync([
  { query: 'q', get: () => filters.search },
  { query: 'type', get: () => filters.type },
  { query: 'category', get: () => filters.category },
  { query: 'status', get: () => filters.status },
  { query: 'from', get: () => filters.dateFrom },
  { query: 'to', get: () => filters.dateTo },
  { query: 'sort', get: () => sort.key },
  { query: 'dir', get: () => sort.dir }
])

const hasFilters = computed(
  () =>
    filters.search ||
    filters.type ||
    filters.category ||
    filters.status ||
    filters.dateFrom ||
    filters.dateTo
)

const filteredTransactions = computed(() => {
  return transactions.value.filter((t) => {
    const search = filters.search.trim().toLowerCase()
    const matchesSearch =
      !search ||
      (t.descricao && t.descricao.toLowerCase().includes(search)) ||
      t.categoria.toLowerCase().includes(search)
    const matchesType = !filters.type || t.tipo === filters.type
    const matchesCategory = !filters.category || t.categoria === filters.category
    const matchesStatus = !filters.status || t.status === filters.status
    const matchesDate = inDateRange(t.data, filters.dateFrom, filters.dateTo)
    return matchesSearch && matchesType && matchesCategory && matchesStatus && matchesDate
  })
})

const sortGetters = {
  data: (t) => t.data,
  data__type: 'date',
  valor: (t) => t.valor,
  valor__type: 'number',
  tipo: (t) => t.tipo,
  status: (t) => t.status,
  status__type: 'status'
}

const displayedTransactions = computed(() =>
  sortRows(filteredTransactions.value, sort.key, sort.dir, sortGetters)
)

const toggleSort = (key) => {
  if (sort.key === key) sort.dir = sort.dir === 'asc' ? 'desc' : 'asc'
  else {
    sort.key = key
    sort.dir = key === 'data' || key === 'valor' ? 'desc' : 'asc'
  }
}

const sortIcon = (key) => {
  if (sort.key !== key) return 'arrows'
  return sort.dir === 'asc' ? 'chevron-up' : 'chevron-down'
}

const totalIn = computed(() =>
  filteredTransactions.value.filter((t) => t.tipo === 'Entrada').reduce((acc, t) => acc + t.valor, 0)
)
const totalOut = computed(() =>
  filteredTransactions.value.filter((t) => t.tipo === 'Saída').reduce((acc, t) => acc + t.valor, 0)
)

const clearFilters = () => {
  filters.search = ''
  filters.type = ''
  filters.category = ''
  filters.status = ''
  filters.dateFrom = ''
  filters.dateTo = ''
}

const formatDate = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('pt-BR')
}
const formatCurrency = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const dotColor = (status) => {
  const x = String(status || '').toLowerCase()
  if (x.includes('aprovado') || x.includes('concluí')) return '#10b981'
  if (x.includes('reprovado')) return '#ef4444'
  if (x.includes('liquidado')) return '#3b82f6'
  if (x.includes('análise') || x.includes('pendente')) return '#f59e0b'
  return '#94a3b8'
}

const openWorkflow = async (id) => {
  if (workflow.open && workflow.transactionId === id) {
    workflow.open = false
    workflow.transactionId = null
    workflow.events = []
    return
  }
  workflow.open = true
  workflow.loading = true
  workflow.transactionId = id
  try {
    workflow.events = await getWorkflowHistory(id)
  } catch (err) {
    showToast(err.message, 'error')
    workflow.events = []
  } finally {
    workflow.loading = false
  }
}

const handleDelete = async (id) => {
  const ok = await confirm({
    title: 'Excluir transação',
    message: 'Deseja remover permanentemente este registro?',
    detail: 'O histórico será alterado e a ação ficará na auditoria.',
    confirmLabel: 'Excluir',
    variant: 'danger'
  })
  if (!ok) return
  try {
    await deleteTransaction(id)
    showToast('Transação removida com sucesso.', 'success')
  } catch (err) {
    showToast(err.message, 'error')
  }
}

const exportCSV = () => {
  const rows = displayedTransactions.value
  if (!rows.length) {
    showToast('Não há transações para exportar.', 'info')
    return
  }
  downloadCsv(
    `transacoes-${new Date().toISOString().slice(0, 10)}.csv`,
    ['Data', 'Descrição', 'Tipo', 'Categoria', 'Valor', 'Status'],
    rows,
    (t) => [t.data, t.descricao || '-', t.tipo, t.categoria, t.valor.toFixed(2), t.status]
  )
  showToast(`CSV gerado (${rows.length} registros).`, 'success')
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
.amount { font-weight: 700; white-space: nowrap; }
.amount.in { color: var(--brand-accent); }
.amount.out { color: var(--text-strong); }

.workflow-cell {
  background: var(--surface-soft);
  padding: 0.5rem 1rem !important;
}
.event-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: flex-start;
}
.th-sortable {
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}
.th-sortable:hover { color: var(--brand-primary); }
.sort-icon { vertical-align: middle; margin-left: 4px; opacity: 0.65; }
</style>
