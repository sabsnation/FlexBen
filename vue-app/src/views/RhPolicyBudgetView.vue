<template>
  <div class="container">
    <PageHeader
      title="Painel executivo do RH"
      subtitle="Governança corporativa em gráficos — previsto × realizado e risco por centro de custo."
      eyebrow="RH / Admin"
    >
      <template #actions>
        <button class="btn btn-secondary" type="button" :disabled="refreshing" @click="load(true)">
          <Icon :name="refreshing ? 'spinner' : 'refresh'" :size="14" :class="refreshing ? 'spin' : ''" />
          Atualizar
        </button>
      </template>
      <template #meta>
        <div class="period-row">
          <div class="form-group" style="margin: 0;">
            <label>Mês</label>
            <select v-model.number="period.month" @change="load">
              <option v-for="m in monthOptions" :key="'m-' + m.value" :value="m.value">{{ m.label }}</option>
            </select>
          </div>
          <div class="form-group" style="margin: 0;">
            <label>Ano</label>
            <select v-model.number="period.year" @change="load">
              <option v-for="y in yearOptions" :key="'y-' + y" :value="y">{{ y }}</option>
            </select>
          </div>
        </div>
      </template>
    </PageHeader>

    <div class="grid cols-2 mb-3">
      <ChartCard title="Programa de benefícios" subtitle="Estrutura do orçamento flex" icon="layers" :legend="programLegend">
        <DonutChart
          :segments="programDonut"
          :size="200"
          center-label="Orçamento"
          :center-value="formatChartCurrency(summary.monthlyBudget)"
        />
      </ChartCard>
      <ChartCard title="Previsto × realizado" subtitle="Consolidado do período selecionado" icon="target" :legend="overviewLegend">
        <GroupedBarChart :groups="overviewBarGroups" :series="budgetSeries" />
      </ChartCard>
    </div>

    <div class="tabs">
      <button class="tab" :class="{ active: tab === 'executive' }" @click="tab = 'executive'">Painel executivo</button>
      <button class="tab" :class="{ active: tab === 'deviation' }" @click="tab = 'deviation'">Desvio por categoria</button>
      <button class="tab" :class="{ active: tab === 'risk' }" @click="tab = 'risk'">Risco por centro de custo</button>
      <button class="tab" :class="{ active: tab === 'policies' }" @click="tab = 'policies'">Políticas</button>
    </div>

    <div v-if="tab === 'executive'" class="stack">
      <div class="grid cols-2">
        <ChartCard title="Composição do orçamento" icon="pie-chart" :legend="usageLegend">
          <DonutChart
            :segments="usageDonut"
            :size="200"
            center-label="Uso global"
            :center-value="`${executive.overview.usagePercent.toFixed(0)}%`"
          />
        </ChartCard>
        <ChartCard title="Desvio consolidado" icon="trending-up">
          <BarChart :items="deviationSummaryBars" />
        </ChartCard>
      </div>
      <ChartCard
        v-if="topCategoryGroups.length"
        title="Top categorias — previsto vs realizado"
        subtitle="Comparativo por bolso de benefício"
        icon="bar-chart"
      >
        <GroupedBarChart :groups="topCategoryGroups" :series="budgetSeries" />
      </ChartCard>
    </div>

    <div v-if="tab === 'deviation'">
      <EmptyState
        v-if="!deviationBarItems.length"
        icon="bar-chart"
        title="Sem dados de desvio"
        message="Nenhuma movimentação no período selecionado."
      />
      <div v-else class="grid cols-2">
        <ChartCard title="Realizado por categoria" icon="bar-chart" :legend="deviationLegend">
          <BarChart :items="deviationBarItems" />
        </ChartCard>
        <ChartCard title="% de uso por categoria" icon="activity">
          <BarChart
            :items="usageByCategoryBars"
            :format-value="(v) => `${Number(v).toFixed(0)}%`"
          />
        </ChartCard>
      </div>
    </div>

    <div v-if="tab === 'risk'" class="stack">
      <EmptyState
        v-if="!riskBarItems.length"
        icon="target"
        title="Sem dados de risco"
        message="Nenhum centro de custo com movimentação no período."
      />
      <div v-else class="grid cols-2">
        <ChartCard title="Uso por centro de custo" icon="target" :legend="riskLegend">
          <BarChart
            :items="riskBarItems"
            :format-value="(v) => `${Number(v).toFixed(0)}%`"
          />
        </ChartCard>
        <ChartCard title="Realizado por centro" icon="dollar-sign">
          <BarChart :items="riskRealizedBars" />
        </ChartCard>
      </div>

      <div v-if="centerDetails.costCenter" class="card">
        <div class="page-header" style="margin-bottom: 1rem; padding-bottom: 1rem;">
          <div class="page-header__text">
            <h3>Drill-down: {{ centerDetails.costCenter }}</h3>
            <p class="muted">Clique em outro centro na lista para alternar</p>
          </div>
          <button class="btn btn-secondary" type="button" @click="clearCenterDetails">
            <Icon name="x" :size="12" /> Fechar
          </button>
        </div>
        <ChartCard title="Categorias do centro" icon="layers" class="nested-chart">
          <BarChart :items="centerCategoryBars" />
        </ChartCard>
      </div>

      <div class="card">
        <h4 class="mb-2">Centros de custo — clique para detalhar</h4>
        <div class="table-wrapper scrollable">
          <table>
            <thead>
              <tr>
                <th>Centro</th>
                <th>Uso</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in executive.costCenterRiskRanking" :key="'cc-' + row.costCenter">
                <td><strong>{{ row.costCenter }}</strong></td>
                <td>
                  <span class="badge" :class="usageBadge(row.usagePercent)">
                    {{ row.usagePercent.toFixed(1) }}%
                  </span>
                </td>
                <td>
                  <button class="btn btn-ghost btn-sm" type="button" @click="loadCenterDetails(row.costCenter)">
                    Detalhar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div v-if="tab === 'policies'">
      <EmptyState
        v-if="!policies.length"
        icon="settings"
        title="Nenhuma política configurada"
        message="Cadastre políticas no banco para regras automáticas."
      />
      <ChartCard v-else title="Políticas por categoria" subtitle="Limite padrão configurado" icon="settings">
        <BarChart :items="policyBarItems" />
      </ChartCard>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { api } from '../api'
import { useToast } from '../toast'
import PageHeader from '../components/PageHeader.vue'
import EmptyState from '../components/EmptyState.vue'
import Icon from '../components/Icon.vue'
import ChartCard from '../components/charts/ChartCard.vue'
import DonutChart from '../components/charts/DonutChart.vue'
import BarChart from '../components/charts/BarChart.vue'
import GroupedBarChart from '../components/charts/GroupedBarChart.vue'
import {
  categoryColor,
  formatChartCurrency,
  colorAt
} from '../config/chartTheme.js'

const formatCurrency = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const tab = ref('executive')
const summary = ref({ activeCategories: 0, monthlyBudget: 0, eligibleEmployees: 0 })
const policies = ref([])
const executive = ref({
  overview: { predictedTotal: 0, realizedTotal: 0, totalDeviation: 0, usagePercent: 0 },
  categoryDeviation: [],
  costCenterRiskRanking: []
})
const centerDetails = ref({
  costCenter: '',
  summary: { predicted: 0, realized: 0, usagePercent: 0 },
  categories: [],
  requests: []
})

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
const refreshing = ref(false)

const budgetSeries = [
  { name: 'Previsto', key: 'predicted', color: '#6366f1' },
  { name: 'Realizado', key: 'realized', color: '#0ea5e9' }
]

const programDonut = computed(() => [
  { label: 'Categorias', value: summary.value.activeCategories, color: '#6366f1' },
  { label: 'Colaboradores', value: summary.value.eligibleEmployees, color: '#10b981' },
  { label: 'Orçamento (k)', value: summary.value.monthlyBudget / 1000, color: '#f59e0b' }
].filter((s) => s.value > 0))

const programLegend = computed(() =>
  programDonut.value.map((s) => ({
    label: s.label,
    color: s.color,
    value: s.label === 'Orçamento (k)' ? formatChartCurrency(summary.value.monthlyBudget) : String(Math.round(s.value))
  }))
)

const overviewBarGroups = computed(() => [
  {
    label: 'Total',
    predicted: executive.value.overview.predictedTotal,
    realized: executive.value.overview.realizedTotal
  }
])

const overviewLegend = computed(() => [
  { label: 'Previsto', color: '#6366f1', value: formatChartCurrency(executive.value.overview.predictedTotal) },
  { label: 'Realizado', color: '#0ea5e9', value: formatChartCurrency(executive.value.overview.realizedTotal) },
  {
    label: 'Desvio',
    color: executive.value.overview.totalDeviation > 0 ? '#ef4444' : '#10b981',
    value: formatChartCurrency(executive.value.overview.totalDeviation)
  }
])

const usageDonut = computed(() => {
  const used = Math.min(100, executive.value.overview.usagePercent)
  return [
    { label: 'Utilizado', value: used, color: '#6366f1' },
    { label: 'Disponível', value: Math.max(0, 100 - used), color: '#e2e8f0' }
  ]
})

const usageLegend = computed(() => [
  { label: 'Uso global', color: '#6366f1', value: `${executive.value.overview.usagePercent.toFixed(1)}%` }
])

const deviationSummaryBars = computed(() => [
  { label: 'Previsto', value: executive.value.overview.predictedTotal, color: '#6366f1' },
  { label: 'Realizado', value: executive.value.overview.realizedTotal, color: '#0ea5e9' },
  {
    label: 'Desvio',
    value: Math.abs(executive.value.overview.totalDeviation),
    color: executive.value.overview.totalDeviation > 0 ? '#ef4444' : '#10b981'
  }
])

const topCategoryGroups = computed(() => {
  const byCat = new Map()
  for (const row of executive.value.categoryDeviation) {
    const cur = byCat.get(row.category) || { label: row.category, predicted: 0, realized: 0 }
    cur.predicted += row.predicted
    cur.realized += row.realized
    byCat.set(row.category, cur)
  }
  return [...byCat.values()]
    .sort((a, b) => b.realized - a.realized)
    .slice(0, 6)
})

const deviationBarItems = computed(() => {
  const byCat = new Map()
  for (const row of executive.value.categoryDeviation) {
    byCat.set(row.category, (byCat.get(row.category) || 0) + row.realized)
  }
  return [...byCat.entries()]
    .map(([label, value], i) => ({ label, value, color: categoryColor(label, i) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
})

const deviationLegend = computed(() =>
  deviationBarItems.value.slice(0, 5).map((s) => ({
    label: s.label,
    color: s.color,
    value: formatChartCurrency(s.value)
  }))
)

const usageByCategoryBars = computed(() => {
  const byCat = new Map()
  for (const row of executive.value.categoryDeviation) {
    const cur = byCat.get(row.category)
    if (!cur || row.usagePercent > cur) byCat.set(row.category, row.usagePercent)
  }
  return [...byCat.entries()]
    .map(([label, value], i) => ({
      label,
      value,
      color: value > 100 ? '#ef4444' : value > 80 ? '#f59e0b' : colorAt(i)
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
})

const riskBarItems = computed(() =>
  executive.value.costCenterRiskRanking
    .map((row, i) => ({
      label: row.costCenter,
      value: row.usagePercent,
      color: row.usagePercent > 100 ? '#ef4444' : row.usagePercent > 80 ? '#f59e0b' : colorAt(i)
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
)

const riskRealizedBars = computed(() =>
  executive.value.costCenterRiskRanking
    .map((row, i) => ({
      label: row.costCenter,
      value: row.realized,
      color: colorAt(i)
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
)

const riskLegend = computed(() =>
  riskBarItems.value.slice(0, 4).map((s) => ({
    label: s.label,
    color: s.color,
    value: `${s.value.toFixed(0)}%`
  }))
)

const centerCategoryBars = computed(() =>
  centerDetails.value.categories.map((row, i) => ({
    label: row.category,
    value: row.realized,
    color: categoryColor(row.category, i)
  }))
)

const policyBarItems = computed(() =>
  policies.value.map((p, i) => ({
    label: `${p.category} (${p.role})`,
    value: p.limit,
    color: categoryColor(p.category, i)
  }))
)

const usageBadge = (pct) => {
  if (pct > 100) return 'badge-danger'
  if (pct > 80) return 'badge-warning'
  return 'badge-success'
}

const load = async (fromButton = false) => {
  if (fromButton) refreshing.value = true
  try {
    const q = `month=${period.value.month}&year=${period.value.year}`
    const [policyData, executiveData] = await Promise.all([
      api.get('/rh/policies/summary'),
      api.get(`/executive/overview?${q}`)
    ])
    summary.value = policyData.summary
    policies.value = policyData.policies
    executive.value = executiveData
    if (fromButton) showToast('Painel atualizado.')
  } catch (err) {
    showToast(err.message, 'error')
  } finally {
    refreshing.value = false
  }
}

const loadCenterDetails = async (costCenter) => {
  try {
    const q = `costCenter=${encodeURIComponent(costCenter)}&month=${period.value.month}&year=${period.value.year}`
    const data = await api.get(`/executive/cost-center-details?${q}`)
    centerDetails.value = data
    tab.value = 'risk'
  } catch (err) {
    showToast(err.message, 'error')
  }
}

const clearCenterDetails = () => {
  centerDetails.value = {
    costCenter: '',
    summary: { predicted: 0, realized: 0, usagePercent: 0 },
    categories: [],
    requests: []
  }
}

onMounted(load)
</script>

<style scoped>
.period-row {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
  flex-wrap: wrap;
  align-items: flex-end;
}
.period-row .form-group { min-width: 140px; }
.nested-chart {
  border: none;
  box-shadow: none;
  padding: 0;
}
</style>
