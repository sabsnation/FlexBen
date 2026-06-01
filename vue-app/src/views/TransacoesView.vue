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

    <div class="grid cols-4 mb-3">
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
      </div>
    </div>

    <div v-if="filteredTransactions.length === 0" class="card">
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
            <th>Data</th>
            <th>Descrição</th>
            <th>Tipo</th>
            <th>Categoria</th>
            <th>Valor</th>
            <th>Status</th>
            <th style="width: 1%;">Ações</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="item in filteredTransactions" :key="item.id">
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
import { reactive, computed, onMounted } from 'vue'
import { useTransactions } from '../transactions'
import { useCategories } from '../categories'
import { useToast } from '../toast'
import { useConfirm } from '../confirm'
import PageHeader from '../components/PageHeader.vue'
import KpiCard from '../components/KpiCard.vue'
import StatusBadge from '../components/StatusBadge.vue'
import EmptyState from '../components/EmptyState.vue'
import Icon from '../components/Icon.vue'

const { transactions, deleteTransaction, loadMine, getWorkflowHistory } = useTransactions()
const { showToast } = useToast()
const { confirm } = useConfirm()
const { categories, loadCategories } = useCategories()

onMounted(async () => {
  await Promise.allSettled([loadMine(), loadCategories()])
})

const categoryNames = computed(() => [...new Set(categories.value.map((c) => c.nome))].sort())

const filters = reactive({ search: '', type: '', category: '', status: '' })
const workflow = reactive({ open: false, loading: false, transactionId: null, events: [] })

const hasFilters = computed(() => filters.search || filters.type || filters.category || filters.status)

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
    return matchesSearch && matchesType && matchesCategory && matchesStatus
  })
})

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
  const rows = filteredTransactions.value
  if (!rows.length) {
    showToast('Não há transações para exportar.', 'info')
    return
  }
  const header = ['Data', 'Descrição', 'Tipo', 'Categoria', 'Valor', 'Status']
  const lines = [
    header.join(';'),
    ...rows.map((t) =>
      [
        t.data,
        `"${String(t.descricao || '-').replace(/"/g, '""')}"`,
        t.tipo,
        t.categoria,
        t.valor.toFixed(2),
        t.status
      ].join(';')
    )
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `transacoes-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
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
</style>
