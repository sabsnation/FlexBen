<template>
  <div class="container">
    <PageHeader
      title="Fechamento mensal financeiro"
      subtitle="Consolidação de movimentos aprovados, liquidação contábil e exportação para a contabilidade."
      eyebrow="Financeiro"
    >
      <template #actions>
        <button class="btn btn-secondary" type="button" @click="exportCsv">
          <Icon name="download" :size="14" /> Exportar CSV
        </button>
        <button
          class="btn btn-primary"
          type="button"
          :disabled="!auth.can('closing_run') || running"
          @click="confirmClose"
        >
          <Icon v-if="running" name="spinner" :size="14" class="spin" />
          <Icon v-else name="zap" :size="14" />
          <span v-if="!running">Executar fechamento</span>
          <span v-else>Processando…</span>
        </button>
      </template>
      <template #meta>
        <div class="period-row">
          <div class="form-group" style="margin: 0;">
            <label>Mês</label>
            <select v-model.number="period.month" @change="load">
              <option v-for="m in monthOptions" :key="'fm-' + m.value" :value="m.value">{{ m.label }}</option>
            </select>
          </div>
          <div class="form-group" style="margin: 0;">
            <label>Ano</label>
            <select v-model.number="period.year" @change="load">
              <option v-for="y in yearOptions" :key="'fy-' + y" :value="y">{{ y }}</option>
            </select>
          </div>
          <div style="align-self: flex-end;">
            <button class="btn btn-ghost" type="button" @click="load">
              <Icon name="refresh" :size="14" /> Atualizar
            </button>
          </div>
        </div>
      </template>
    </PageHeader>

    <div class="grid cols-3 mb-3">
      <KpiCard label="Mês de referência" :value="summary.referenceMonth || '—'" tone="info" icon="calendar" />
      <KpiCard label="Total aprovado" :value="summary.approvedTotal" format="currency" tone="success" icon="check-circle" />
      <KpiCard label="Itens em aberto" :value="summary.pendingCount" tone="warning" icon="clock" hint="Aprovados aguardando liquidação." />
    </div>

    <div class="grid cols-3 mb-3">
      <KpiCard label="Orçamento previsto" :value="executive.overview.predictedTotal" format="currency" icon="target" />
      <KpiCard label="Realizado" :value="executive.overview.realizedTotal" format="currency" tone="info" icon="bar-chart" />
      <KpiCard
        label="Uso do orçamento"
        :value="executive.overview.usagePercent"
        format="percent"
        :tone="executive.overview.usagePercent > 100 ? 'danger' : executive.overview.usagePercent > 80 ? 'warning' : 'success'"
        icon="activity"
      />
    </div>

    <div v-if="!auth.can('closing_run')" class="notice info">
      <Icon class="notice-icon" name="info" :size="18" />
      <span>Apenas perfis financeiro e administrativo podem executar o fechamento.</span>
    </div>

    <div class="card mb-3">
      <h3 class="card-title">
        <span class="title-with-icon">
          <span class="icon-bg sm"><Icon name="pie-chart" :size="14" /></span>
          Consolidação por categoria
        </span>
        <span class="muted text-xs">{{ lines.length }} categoria(s)</span>
      </h3>
      <EmptyState v-if="!lines.length" icon="dollar-sign" title="Sem dados para fechamento" message="Não há movimentações aprovadas no período selecionado." />
      <div v-else class="table-wrapper" style="border: none; box-shadow: none;">
        <table>
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Movimentos</th>
              <th>Valor consolidado</th>
              <th>Participação</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="line in lines" :key="line.category">
              <td><strong>{{ line.category }}</strong></td>
              <td>{{ line.count }}</td>
              <td><strong>{{ formatCurrency(line.total) }}</strong></td>
              <td>
                <div class="participation">
                  <div class="participation__bar">
                    <div class="progress-bar-fill" :style="{ width: pctOfTotal(line.total) + '%' }"></div>
                  </div>
                  <span>{{ pctOfTotal(line.total).toFixed(1) }}%</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="card mb-3">
      <h3 class="card-title">
        <span class="title-with-icon">
          <span class="icon-bg sm warning"><Icon name="alert-triangle" :size="14" /></span>
          Risco por centro de custo
        </span>
      </h3>
      <EmptyState v-if="!executive.costCenterRiskRanking.length" icon="target" title="Sem dados de risco" message="Nenhum centro de custo movimentado no período." />
      <div v-else class="table-wrapper" style="border: none; box-shadow: none;">
        <table>
          <thead>
            <tr>
              <th>Centro de custo</th>
              <th>Previsto</th>
              <th>Realizado</th>
              <th>Uso</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in executive.costCenterRiskRanking" :key="'risk-' + row.costCenter">
              <td>
                <button class="btn-link" type="button" @click="loadCenterDetails(row.costCenter)">
                  {{ row.costCenter }}
                </button>
              </td>
              <td>{{ formatCurrency(row.predicted) }}</td>
              <td>{{ formatCurrency(row.realized) }}</td>
              <td>
                <span class="badge" :class="usageBadge(row.usagePercent)">{{ row.usagePercent.toFixed(1) }}%</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="centerDetails.costCenter" class="card">
      <div class="page-header" style="margin-bottom: 1rem; padding-bottom: 1rem;">
        <div class="page-header__text">
          <h3>Detalhamento: {{ centerDetails.costCenter }}</h3>
          <p class="muted">
            Previsto {{ formatCurrency(centerDetails.summary.predicted) }} ·
            Realizado {{ formatCurrency(centerDetails.summary.realized) }} ·
            Desvio {{ formatCurrency(centerDetails.summary.deviation || 0) }}
          </p>
        </div>
        <button class="btn btn-secondary" type="button" @click="clearCenterDetails">
          <Icon name="x" :size="12" /> Fechar
        </button>
      </div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Solicitante</th>
              <th>Categoria</th>
              <th>Valor</th>
              <th>Status</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="req in centerDetails.requests" :key="'fin-req-' + req.id">
              <td>{{ req.requesterName }}</td>
              <td>{{ req.category }}</td>
              <td><strong>{{ formatCurrency(req.amount) }}</strong></td>
              <td><StatusBadge :status="req.status" /></td>
              <td class="muted">{{ req.requestedAt }}</td>
            </tr>
            <tr v-if="!centerDetails.requests.length">
              <td colspan="5" class="table-empty">Sem solicitações para este centro.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, computed } from 'vue'
import { api } from '../api'
import { useToast } from '../toast'
import { useAuth } from '../auth'
import PageHeader from '../components/PageHeader.vue'
import KpiCard from '../components/KpiCard.vue'
import StatusBadge from '../components/StatusBadge.vue'
import EmptyState from '../components/EmptyState.vue'
import Icon from '../components/Icon.vue'

const formatCurrency = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const summary = ref({ referenceMonth: '-', approvedTotal: 0, pendingCount: 0 })
const lines = ref([])
const executive = ref({
  overview: { predictedTotal: 0, realizedTotal: 0, usagePercent: 0 },
  costCenterRiskRanking: []
})
const centerDetails = ref({
  costCenter: '',
  summary: { predicted: 0, realized: 0, deviation: 0, usagePercent: 0 },
  categories: [],
  requests: []
})
const running = ref(false)

const now = new Date()
const period = ref({ month: now.getMonth() + 1, year: now.getFullYear() })
const monthOptions = [
  { value: 1, label: 'Jan' }, { value: 2, label: 'Fev' }, { value: 3, label: 'Mar' },
  { value: 4, label: 'Abr' }, { value: 5, label: 'Mai' }, { value: 6, label: 'Jun' },
  { value: 7, label: 'Jul' }, { value: 8, label: 'Ago' }, { value: 9, label: 'Set' },
  { value: 10, label: 'Out' }, { value: 11, label: 'Nov' }, { value: 12, label: 'Dez' }
]
const yearOptions = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]
const { showToast } = useToast()
const auth = useAuth()

const totalLines = computed(() => lines.value.reduce((sum, l) => sum + l.total, 0))
const pctOfTotal = (val) => (totalLines.value > 0 ? (val / totalLines.value) * 100 : 0)
const usageBadge = (pct) => {
  if (pct > 100) return 'badge-danger'
  if (pct > 80) return 'badge-warning'
  return 'badge-success'
}

const load = async () => {
  try {
    const q = `month=${period.value.month}&year=${period.value.year}`
    const [closingData, executiveData] = await Promise.all([
      api.get(`/finance/closing/summary?${q}`),
      api.get(`/executive/overview?${q}`)
    ])
    summary.value = closingData.summary
    lines.value = closingData.lines
    executive.value = executiveData
  } catch (err) {
    showToast(err.message, 'error')
  }
}

const loadCenterDetails = async (costCenter) => {
  try {
    const q = `costCenter=${encodeURIComponent(costCenter)}&month=${period.value.month}&year=${period.value.year}`
    const data = await api.get(`/executive/cost-center-details?${q}`)
    centerDetails.value = data
  } catch (err) {
    showToast(err.message, 'error')
  }
}

const clearCenterDetails = () => {
  centerDetails.value = {
    costCenter: '',
    summary: { predicted: 0, realized: 0, deviation: 0, usagePercent: 0 },
    categories: [],
    requests: []
  }
}

const confirmClose = async () => {
  if (!auth.can('closing_run')) {
    showToast('Seu perfil não possui permissão para executar o fechamento.', 'error')
    return
  }
  if (!confirm('Confirmar execução do fechamento mensal? Esta ação liquidará todos os movimentos aprovados.')) return
  running.value = true
  try {
    const out = await api.post('/finance/closing/run', {})
    showToast(`Fechamento executado (${out.referenceMonth}).`, 'success')
    await load()
  } catch (err) {
    showToast(err.message, 'error')
  } finally {
    running.value = false
  }
}

const exportCsv = async () => {
  try {
    const csv = await api.getText('/finance/closing/export.csv')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fechamento-financeiro-${period.value.year}-${String(period.value.month).padStart(2, '0')}.csv`
    a.click()
    URL.revokeObjectURL(url)
    showToast('CSV exportado com sucesso.', 'success')
  } catch (err) {
    showToast(err.message, 'error')
  }
}

onMounted(load)
</script>

<style scoped>
.title-with-icon { display: inline-flex; align-items: center; gap: 10px; }
.period-row {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
  flex-wrap: wrap;
  align-items: flex-end;
}
.period-row .form-group { min-width: 140px; }
.participation { display: flex; align-items: center; gap: 10px; }
.participation__bar {
  flex: 1;
  height: 6px;
  background: var(--surface-strong);
  border-radius: var(--radius-full);
  overflow: hidden;
  min-width: 80px;
}
.participation span {
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--text-muted);
  min-width: 44px;
  text-align: right;
}
</style>
