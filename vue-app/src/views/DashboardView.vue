<template>
  <div class="container">
    <PageHeader
      :title="`Olá, ${firstName}!`"
      :subtitle="welcomeMessage"
      :eyebrow="todayLabel"
    >
      <template #actions>
        <RouterLink to="/realocar" class="btn btn-secondary">
          <Icon name="swap" :size="14" /> Realocar
        </RouterLink>
        <RouterLink v-if="auth.can('usage_register')" to="/utilizacao" class="btn btn-primary">
          <Icon name="plus" :size="14" /> Registrar uso
        </RouterLink>
      </template>
    </PageHeader>

    <div class="card mb-3">
      <div class="balance-panel__head">
        <h3 class="card-title">
          <span class="card-title-with-icon">
            <span class="icon-bg sm success"><Icon name="dollar-sign" :size="14" /></span>
            Saldos por categoria
          </span>
        </h3>
        <button
          type="button"
          class="btn btn-ghost btn-sm"
          :disabled="balancesLoading"
          @click="refreshBalances"
        >
          <Icon :name="balancesLoading ? 'spinner' : 'refresh'" :size="12" :class="balancesLoading ? 'spin' : ''" />
          Atualizar
        </button>
      </div>
      <p v-if="balancesLoading" class="muted text-sm">Carregando saldos…</p>
      <EmptyState
        v-else-if="!balanceRows.length"
        icon="layers"
        title="Sem crédito alocado"
        :message="emptyBalancesMessage"
      />
      <ul v-else class="balance-grid">
        <li v-for="row in balanceRows" :key="row.categoria" class="balance-grid__item">
          <span class="balance-grid__dot" :style="{ background: row.color }" />
          <div class="balance-grid__info">
            <span class="balance-grid__name">{{ row.categoria }}</span>
            <span class="balance-grid__meta">Limite {{ formatCurrency(row.limite) }}</span>
          </div>
          <strong class="balance-grid__value">{{ formatCurrency(row.saldo) }}</strong>
        </li>
      </ul>
      <div v-if="balanceRows.length" class="balance-panel__total">
        <span class="muted">Saldo total disponível</span>
        <strong>{{ formatCurrency(personalTotalBalance) }}</strong>
      </div>
    </div>

    <div class="grid cols-2 mb-3">
      <ChartCard
        title="Fluxo de movimentações"
        subtitle="Créditos vs utilizações ao longo do período"
        icon="activity"
      >
        <EmptyState
          v-if="!flowLabels.length"
          icon="bar-chart"
          title="Sem histórico"
          message="Suas transações alimentarão este gráfico."
        />
        <LineChart
          v-else
          :labels="flowLabels"
          :series="flowSeries"
        />
      </ChartCard>

      <ChartCard
        title="Status das transações"
        subtitle="Distribuição por situação atual"
        icon="check-circle"
        :legend="statusLegend"
      >
        <EmptyState
          v-if="!statusDonutSegments.length"
          icon="inbox"
          title="Sem transações"
          message="Suas movimentações aparecerão aqui."
        />
        <DonutChart
          v-else
          :segments="statusDonutSegments"
          :size="180"
          center-label="Total"
          :center-value="String(transactions.length)"
        />
      </ChartCard>
    </div>

    <div class="grid cols-2 mb-3">
      <ChartCard
        title="Gastos por categoria"
        subtitle="Onde você mais utilizou o benefício"
        icon="bar-chart"
        :legend="spendLegend"
      >
        <EmptyState
          v-if="!spendBarItems.length"
          icon="pie-chart"
          title="Sem gastos"
          message="Registre uma utilização para ver a distribuição."
        />
        <DonutChart
          v-else
          :segments="spendDonutSegments"
          center-label="Gastos"
          :center-value="formatChartCurrency(totalExpenses)"
        />
      </ChartCard>

      <ChartCard title="Status e alertas" subtitle="Resumo rápido da sua conta" icon="bell">
        <div class="alerts-stack">
          <div v-if="usagePercentage > 80" class="alert-item danger">
            <Icon name="alert-triangle" :size="16" />
            <span>Uso elevado do limite mensal ({{ usagePercentage.toFixed(0) }}%). Considere realocar.</span>
          </div>
          <div v-if="hasPendingDecisions" class="alert-item warning">
            <Icon name="clock" :size="16" />
            <span>{{ pendingDecisionsCount }} solicitação(ões) em análise.</span>
          </div>
          <BarChart
            v-if="usageBarItems.length"
            :items="usageBarItems"
            class="usage-mini-bar"
          />
          <div v-if="!hasPendingDecisions && usagePercentage <= 80" class="alert-item success">
            <Icon name="check-circle" :size="16" />
            <span>Conta em dia — dentro do orçamento planejado.</span>
          </div>
        </div>
      </ChartCard>
    </div>

    <div v-if="auth.isManager || auth.isAdmin" class="card mb-3 chart-section">
      <div class="chart-section__head">
        <h3 class="card-title">
          <span class="card-title-with-icon">
            <span class="icon-bg sm info"><Icon name="briefcase" :size="14" /></span>
            Visão de gestão
          </span>
        </h3>
        <RouterLink class="link" to="/gestor/aprovacoes">
          Ver fila <Icon name="arrow-right" :size="12" />
        </RouterLink>
      </div>
      <div class="grid cols-2">
        <ChartCard title="Fila de aprovações" subtitle="Distribuição por status" icon="check-circle" :legend="approvalLegend">
          <DonutChart :segments="approvalDonut" :size="180" center-label="Total" :center-value="String(approvalTotal)" />
        </ChartCard>
        <ChartCard title="SLA de aprovação" subtitle="Tempo médio de decisão" icon="clock" min-height="260px">
          <BarChart
            :items="slaBarItems"
            :horizontal="false"
            :height="220"
          />
        </ChartCard>
      </div>
    </div>

    <div v-if="auth.isAdmin" class="card mb-3 chart-section">
      <div class="chart-section__head">
        <h3 class="card-title">
          <span class="card-title-with-icon">
            <span class="icon-bg sm"><Icon name="target" :size="14" /></span>
            Visão executiva (RH)
          </span>
        </h3>
        <RouterLink class="link" to="/rh/politicas">Painel completo <Icon name="arrow-right" :size="12" /></RouterLink>
      </div>
      <div class="grid cols-2">
        <ChartCard title="Orçamento previsto × realizado" icon="bar-chart" :legend="execLegend">
          <GroupedBarChart
            :groups="execBudgetGroups"
            :series="execBudgetSeries"
          />
        </ChartCard>
        <ChartCard title="Uso do orçamento" icon="activity">
          <DonutChart
            :segments="execUsageDonut"
            :size="180"
            center-label="Uso"
            :center-value="`${Number(executive.usagePercent || 0).toFixed(0)}%`"
          />
        </ChartCard>
      </div>
    </div>

    <div v-if="auth.isFinance || auth.isAdmin" class="card mb-3 chart-section">
      <div class="chart-section__head">
        <h3 class="card-title">
          <span class="card-title-with-icon">
            <span class="icon-bg sm warning"><Icon name="dollar-sign" :size="14" /></span>
            Operação financeira
          </span>
        </h3>
        <RouterLink class="link" to="/financeiro/fechamento">Fechamento <Icon name="arrow-right" :size="12" /></RouterLink>
      </div>
      <div class="grid cols-2">
        <ChartCard :title="`Fechamento · ${finance.referenceMonth || 'mês atual'}`" icon="calendar">
          <DonutChart
            :segments="financeDonut"
            :size="180"
            center-label="Aprovado"
            :center-value="formatChartCurrency(finance.approvedTotal)"
          />
        </ChartCard>
        <ChartCard title="Itens em aberto" icon="clock">
          <BarChart :items="financeBarItems" />
        </ChartCard>
      </div>
    </div>

    <div class="card">
      <h3 class="card-title">
        <span class="card-title-with-icon">
          <span class="icon-bg sm"><Icon name="activity" :size="14" /></span>
          Atividades recentes
        </span>
        <RouterLink class="link" to="/transacoes">Ver histórico <Icon name="arrow-right" :size="12" /></RouterLink>
      </h3>
      <EmptyState
        v-if="transactions.length === 0"
        icon="inbox"
        title="Sem movimentações"
        message="Suas próximas transações aparecerão aqui."
      />
      <div v-else class="timeline">
        <div v-for="item in transactions.slice(0, 6)" :key="item.id" class="timeline-item">
          <div class="timeline-dot" :style="{ background: item.tipo === 'Saída' ? '#ef4444' : '#10b981' }" />
          <div class="timeline-content">
            <div class="timeline-row">
              <div class="timeline-info">
                <div class="timeline-head">
                  <strong>{{ item.descricao || item.tipo }}</strong>
                  <StatusBadge :status="item.status" />
                </div>
                <div class="muted timeline-meta">{{ item.categoria }} · {{ item.data }}</div>
              </div>
              <div :class="['timeline-amount', item.tipo === 'Entrada' ? 'in' : 'out']">
                {{ item.tipo === 'Saída' ? '−' : '+' }} {{ formatCurrency(item.valor) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useTransactions } from '../transactions'
import { useCategories } from '../categories'
import { useAuth } from '../auth'
import { useToast } from '../toast'
import { api } from '../api'
import PageHeader from '../components/PageHeader.vue'
import EmptyState from '../components/EmptyState.vue'
import StatusBadge from '../components/StatusBadge.vue'
import Icon from '../components/Icon.vue'
import ChartCard from '../components/charts/ChartCard.vue'
import DonutChart from '../components/charts/DonutChart.vue'
import BarChart from '../components/charts/BarChart.vue'
import LineChart from '../components/charts/LineChart.vue'
import GroupedBarChart from '../components/charts/GroupedBarChart.vue'
import {
  categoryColor,
  formatChartCurrency
} from '../config/chartTheme.js'

const {
  transactions,
  totalBalance,
  loadMine,
  loadMyBalances,
  balancesByCategory,
  categoryBalance,
  categoryLimit
} = useTransactions()
const { categories, loadCategories } = useCategories()
const auth = useAuth()

const manager = ref({ kpis: { inAnalysis: 0, approved: 0, rejected: 0, avgApprovalHours: 0 } })
const executive = ref({ predictedTotal: 0, realizedTotal: 0, totalDeviation: 0, usagePercent: 0 })
const finance = ref({ referenceMonth: '', approvedTotal: 0, pendingCount: 0 })
const balancesLoading = ref(false)

const { showToast } = useToast()

const refreshBalances = async () => {
  balancesLoading.value = true
  try {
    await Promise.all([loadCategories(), loadMyBalances(), loadMine()])
    showToast('Saldos atualizados.', 'success')
  } catch (e) {
    showToast(e.message || 'Falha ao atualizar saldos.', 'error')
  } finally {
    balancesLoading.value = false
  }
}

onMounted(async () => {
  balancesLoading.value = true
  try {
    const results = await Promise.allSettled([
      loadMine(),
      loadCategories(),
      loadMyBalances()
    ])
    const failed = results.find((r) => r.status === 'rejected')
    if (failed) {
      showToast(failed.reason?.message || 'Falha ao carregar dados do painel.', 'error')
    }
  } finally {
    balancesLoading.value = false
  }

  if (auth.isManager.value || auth.isAdmin.value) {
    try {
      const data = await api.get('/manager/sla-summary')
      manager.value.kpis = data.kpis
    } catch {}
  }
  if (auth.isAdmin.value) {
    try {
      const data = await api.get('/executive/overview')
      executive.value = data.overview
    } catch {}
  }
  if (auth.isFinance.value || auth.isAdmin.value) {
    try {
      const data = await api.get('/finance/closing/summary')
      finance.value = data.summary
    } catch {}
  }
})

const firstName = computed(() => auth.user.value?.nome?.split(' ')[0] || 'colaborador')
const todayLabel = computed(() => {
  const now = new Date()
  return now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
})

const welcomeMessage = computed(() => {
  if (auth.isAdmin.value) return 'Visão integrada do programa de benefícios corporativos.'
  if (auth.isManager.value) return 'Acompanhe sua fila de aprovações e SLA da equipe.'
  if (auth.isFinance.value) return 'Consolidação financeira e fechamentos do mês.'
  return 'Acompanhe seu saldo flex, distribuição por categoria e movimentações recentes.'
})

const totalExpenses = computed(() =>
  transactions.value.filter((t) => t.tipo === 'Saída').reduce((acc, t) => acc + t.valor, 0)
)

const totalLimit = computed(() =>
  categories.value.filter((c) => c.status !== 'Inativa').reduce((sum, c) => sum + Number(c.limite), 0)
)

const usagePercentage = computed(() => {
  const cap = totalLimit.value
  if (!cap) return 0
  return Math.min((totalExpenses.value / cap) * 100, 100)
})

const activeCategories = computed(() =>
  categories.value.filter((c) => c.status !== 'Inativa')
)

const rowFromCategory = (c, i) => {
  const stored = balancesByCategory.value[c.nome]
  const saldo = stored != null ? Number(stored.saldo) || 0 : categoryBalance(c.nome)
  const limite = stored != null ? Number(stored.limite) || 0 : categoryLimit(c.nome) || Number(c.limite) || 0
  return {
    categoria: c.nome,
    saldo,
    limite,
    color: categoryColor(c.nome, i)
  }
}

const balanceRows = computed(() =>
  activeCategories.value.map((c, i) => rowFromCategory(c, i)).sort((a, b) => b.saldo - a.saldo)
)

const personalTotalBalance = computed(() =>
  balanceRows.value.reduce((sum, row) => sum + Math.max(0, row.saldo), 0)
)

const emptyBalancesMessage = computed(() => {
  if (auth.isAdmin.value || auth.isFinance.value) {
    return 'Sua conta de gestão não possui créditos pessoais. Use Alocar créditos para colaboradores.'
  }
  return 'Aguarde a alocação de créditos pelo RH ou registre a carga mensal.'
})

const categoryTotals = computed(() => {
  const totals = {}
  transactions.value
    .filter((t) => t.tipo === 'Saída')
    .forEach((t) => {
      totals[t.categoria] = (totals[t.categoria] || 0) + t.valor
    })
  return totals
})

const spendDonutSegments = computed(() =>
  Object.entries(categoryTotals.value)
    .map(([label, value], i) => ({ label, value, color: categoryColor(label, i) }))
    .sort((a, b) => b.value - a.value)
)

const spendBarItems = computed(() => spendDonutSegments.value)
const spendLegend = computed(() =>
  spendDonutSegments.value.slice(0, 5).map((s) => ({
    label: s.label,
    color: s.color,
    value: formatChartCurrency(s.value)
  }))
)

const usageBarItems = computed(() => [
  { label: 'Utilizado', value: totalExpenses.value, color: '#f59e0b' },
  {
    label: 'Disponível',
    value: Math.max(0, totalBalance.value - totalExpenses.value),
    color: '#10b981'
  }
])

function parsePtDate(str) {
  if (!str || typeof str !== 'string') return 0
  const parts = str.split('/')
  if (parts.length !== 3) return 0
  const [dd, mm, yyyy] = parts.map(Number)
  return new Date(yyyy, mm - 1, dd).getTime()
}

const flowByDate = computed(() => {
  const map = new Map()
  for (const t of transactions.value) {
    const key = t.data || '—'
    if (!map.has(key)) map.set(key, { entradas: 0, saidas: 0, ts: parsePtDate(key) })
    const row = map.get(key)
    if (t.tipo === 'Entrada') row.entradas += t.valor
    else row.saidas += t.valor
  }
  return [...map.entries()]
    .sort((a, b) => a[1].ts - b[1].ts)
    .slice(-8)
})

const flowLabels = computed(() => flowByDate.value.map(([d]) => d.split('/').slice(0, 2).join('/')))
const flowSeries = computed(() => [
  {
    name: 'Créditos',
    color: '#10b981',
    values: flowByDate.value.map(([, v]) => v.entradas)
  },
  {
    name: 'Utilizações',
    color: '#ef4444',
    values: flowByDate.value.map(([, v]) => v.saidas)
  }
])

const STATUS_COLORS = {
  'Concluída': '#10b981',
  'Em análise': '#f59e0b',
  'Pendente': '#6366f1',
  'Reprovada': '#ef4444',
  'Cancelada': '#94a3b8'
}

const statusDonutSegments = computed(() => {
  const counts = {}
  for (const t of transactions.value) {
    counts[t.status] = (counts[t.status] || 0) + 1
  }
  return Object.entries(counts)
    .map(([label, value]) => ({ label, value, color: STATUS_COLORS[label] || '#94a3b8' }))
    .sort((a, b) => b.value - a.value)
})

const statusLegend = computed(() =>
  statusDonutSegments.value.map((s) => ({ label: s.label, color: s.color, value: String(s.value) }))
)

const pendingDecisionsCount = computed(() =>
  transactions.value.filter((t) => ['Em análise', 'Pendente'].includes(t.status)).length
)
const hasPendingDecisions = computed(() => pendingDecisionsCount.value > 0)

const approvalDonut = computed(() => [
  { label: 'Em análise', value: manager.value.kpis.inAnalysis, color: '#f59e0b' },
  { label: 'Aprovadas', value: manager.value.kpis.approved, color: '#10b981' },
  { label: 'Reprovadas', value: manager.value.kpis.rejected, color: '#ef4444' }
].filter((s) => s.value > 0))

const approvalTotal = computed(() =>
  manager.value.kpis.inAnalysis + manager.value.kpis.approved + manager.value.kpis.rejected
)

const approvalLegend = computed(() =>
  approvalDonut.value.map((s) => ({ label: s.label, color: s.color, value: String(s.value) }))
)

const slaBarItems = computed(() => [
  { label: 'SLA médio (h)', value: manager.value.kpis.avgApprovalHours, color: '#6366f1' },
  { label: 'Em análise', value: manager.value.kpis.inAnalysis, color: '#f59e0b' }
])

const execBudgetGroups = computed(() => [
  {
    label: 'Orçamento',
    predicted: executive.value.predictedTotal,
    realized: executive.value.realizedTotal
  }
])

const execBudgetSeries = computed(() => [
  { name: 'Previsto', key: 'predicted', color: '#6366f1' },
  { name: 'Realizado', key: 'realized', color: '#0ea5e9' }
])

const execLegend = computed(() => [
  { label: 'Previsto', color: '#6366f1', value: formatChartCurrency(executive.value.predictedTotal) },
  { label: 'Realizado', color: '#0ea5e9', value: formatChartCurrency(executive.value.realizedTotal) }
])

const execUsageDonut = computed(() => {
  const used = Math.min(100, Number(executive.value.usagePercent) || 0)
  return [
    { label: 'Utilizado', value: used, color: '#6366f1' },
    { label: 'Margem', value: Math.max(0, 100 - used), color: '#e2e8f0' }
  ]
})

const financeDonut = computed(() => {
  const approved = finance.value.approvedTotal
  const pending = finance.value.pendingCount * 1000
  return [
    { label: 'Aprovado', value: approved, color: '#10b981' },
    { label: 'Em aberto (est.)', value: pending, color: '#f59e0b' }
  ].filter((s) => s.value > 0)
})

const financeBarItems = computed(() => [
  { label: 'Pendentes', value: finance.value.pendingCount, color: '#f59e0b' },
  { label: 'Aprovado (R$)', value: finance.value.approvedTotal / 1000, color: '#10b981' }
])

const formatCurrency = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
</script>

<style scoped>
.balance-panel__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}
.balance-panel__head .card-title { margin: 0; }
.balance-grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
}
.balance-grid__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  background: var(--surface-soft);
}
.balance-grid__dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  flex-shrink: 0;
}
.balance-grid__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.balance-grid__name {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--text-strong);
}
.balance-grid__meta {
  font-size: 0.72rem;
  color: var(--text-muted);
}
.balance-grid__value {
  font-size: var(--text-sm);
  font-variant-numeric: tabular-nums;
  color: var(--brand-accent);
}
.balance-panel__total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 2px solid var(--border-light);
}
.balance-panel__total strong {
  font-size: 1.15rem;
  color: var(--text-strong);
}

.card-title-with-icon {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}
.chart-section__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.chart-section .chart-card {
  box-shadow: none;
  border: 1px solid var(--border-light);
}
.alerts-stack {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
}
.alert-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 0.85rem 1rem;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 500;
  border: 1px solid transparent;
  line-height: 1.45;
}
.alert-item.danger  { background: var(--brand-danger-soft); color: #991b1b; border-color: #fecaca; }
.alert-item.warning { background: var(--brand-warn-soft); color: #854d0e; border-color: #fde68a; }
.alert-item.success { background: var(--brand-accent-soft); color: #166534; border-color: #bbf7d0; }
.usage-mini-bar { margin-top: 0.5rem; }
.timeline-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: flex-start;
}
.timeline-info { flex: 1; min-width: 0; }
.timeline-head {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 2px;
}
.timeline-meta { font-size: var(--text-xs); }
.timeline-amount {
  font-weight: 800;
  font-size: var(--text-md);
  letter-spacing: -0.01em;
  white-space: nowrap;
}
.timeline-amount.in { color: var(--brand-accent); }
.timeline-amount.out { color: var(--text-strong); }
</style>
