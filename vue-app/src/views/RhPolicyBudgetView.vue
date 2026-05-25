<template>
  <div class="container">
    <PageHeader
      title="Painel executivo do RH"
      subtitle="Governança corporativa, orçamento previsto × realizado e drill-down por centro de custo."
      eyebrow="RH / Admin"
    >
      <template #actions>
        <button class="btn btn-secondary" type="button" @click="load">
          <Icon name="refresh" :size="14" /> Atualizar
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

    <div class="grid cols-3 mb-3">
      <KpiCard label="Categorias ativas" :value="summary.activeCategories" tone="info" icon="layers" />
      <KpiCard label="Orçamento mensal previsto" :value="summary.monthlyBudget" format="currency" tone="warning" icon="target" />
      <KpiCard label="Colaboradores elegíveis" :value="summary.eligibleEmployees" tone="success" icon="users" />
    </div>

    <div class="tabs">
      <button class="tab" :class="{ active: tab === 'executive' }" @click="tab = 'executive'">Painel executivo</button>
      <button class="tab" :class="{ active: tab === 'deviation' }" @click="tab = 'deviation'">Desvio por categoria</button>
      <button class="tab" :class="{ active: tab === 'risk' }" @click="tab = 'risk'">Risco por centro de custo</button>
      <button class="tab" :class="{ active: tab === 'policies' }" @click="tab = 'policies'">Políticas</button>
    </div>

    <div v-if="tab === 'executive'" class="stack">
      <div class="grid cols-4">
        <KpiCard label="Previsto total" :value="executive.overview.predictedTotal" format="currency" icon="target" />
        <KpiCard label="Realizado total" :value="executive.overview.realizedTotal" format="currency" tone="info" icon="bar-chart" />
        <KpiCard
          label="Desvio total"
          :value="executive.overview.totalDeviation"
          format="currency"
          :tone="executive.overview.totalDeviation > 0 ? 'danger' : 'success'"
          icon="trending-up"
        />
        <KpiCard
          label="Uso do orçamento"
          :value="executive.overview.usagePercent"
          format="percent"
          :tone="executive.overview.usagePercent > 100 ? 'danger' : executive.overview.usagePercent > 80 ? 'warning' : 'success'"
          icon="activity"
        />
      </div>
    </div>

    <div v-if="tab === 'deviation'">
      <EmptyState v-if="!executive.categoryDeviation.length" icon="bar-chart" title="Sem dados de desvio" message="Nenhuma movimentação no período selecionado." />
      <div v-else class="table-wrapper scrollable">
        <table>
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Centro de custo</th>
              <th>Previsto</th>
              <th>Realizado</th>
              <th>Desvio</th>
              <th>Uso</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in executive.categoryDeviation" :key="'dev-' + row.category">
              <td><strong>{{ row.category }}</strong></td>
              <td>{{ row.costCenter }}</td>
              <td>{{ formatCurrency(row.predicted) }}</td>
              <td>{{ formatCurrency(row.realized) }}</td>
              <td :class="row.deviation > 0 ? 'text-danger font-bold' : 'text-success font-bold'">
                {{ formatCurrency(row.deviation) }}
              </td>
              <td>
                <span class="badge" :class="usageBadge(row.usagePercent)">{{ row.usagePercent.toFixed(1) }}%</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="tab === 'risk'" class="stack">
      <EmptyState v-if="!executive.costCenterRiskRanking.length" icon="target" title="Sem dados de risco" message="Nenhum centro de custo com movimentação no período." />
      <div v-else class="table-wrapper scrollable">
        <table>
          <thead>
            <tr>
              <th>Centro de custo</th>
              <th>Categorias</th>
              <th>Previsto</th>
              <th>Realizado</th>
              <th>Uso</th>
              <th>Desvio</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in executive.costCenterRiskRanking" :key="'cc-' + row.costCenter">
              <td>
                <button class="btn-link" type="button" @click="loadCenterDetails(row.costCenter)">
                  {{ row.costCenter }}
                </button>
              </td>
              <td>{{ row.categories }}</td>
              <td>{{ formatCurrency(row.predicted) }}</td>
              <td>{{ formatCurrency(row.realized) }}</td>
              <td>
                <span class="badge" :class="usageBadge(row.usagePercent)">{{ row.usagePercent.toFixed(1) }}%</span>
              </td>
              <td :class="row.deviation > 0 ? 'text-danger font-bold' : 'text-success font-bold'">
                {{ formatCurrency(row.deviation) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="centerDetails.costCenter" class="card">
        <div class="page-header" style="margin-bottom: 1rem; padding-bottom: 1rem;">
          <div class="page-header__text">
            <h3>Drill-down: {{ centerDetails.costCenter }}</h3>
            <p class="muted">
              Previsto {{ formatCurrency(centerDetails.summary.predicted) }} ·
              Realizado {{ formatCurrency(centerDetails.summary.realized) }} ·
              Uso {{ centerDetails.summary.usagePercent.toFixed(1) }}%
            </p>
          </div>
          <button class="btn btn-secondary" type="button" @click="clearCenterDetails">
            <Icon name="x" :size="12" /> Fechar
          </button>
        </div>

        <h4 class="mb-2">Categorias impactadas</h4>
        <div class="table-wrapper mb-3">
          <table>
            <thead>
              <tr>
                <th>Categoria</th>
                <th>Previsto</th>
                <th>Realizado</th>
                <th>Desvio</th>
                <th>Uso</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in centerDetails.categories" :key="'detail-cat-' + row.category">
                <td><strong>{{ row.category }}</strong></td>
                <td>{{ formatCurrency(row.predicted) }}</td>
                <td>{{ formatCurrency(row.realized) }}</td>
                <td>{{ formatCurrency(row.deviation) }}</td>
                <td>{{ row.usagePercent.toFixed(1) }}%</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h4 class="mb-2">Solicitações relacionadas</h4>
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
              <tr v-for="req in centerDetails.requests" :key="'detail-req-' + req.id">
                <td>{{ req.requesterName }}</td>
                <td>{{ req.category }}</td>
                <td>{{ formatCurrency(req.amount) }}</td>
                <td><StatusBadge :status="req.status" /></td>
                <td class="muted">{{ req.requestedAt }}</td>
              </tr>
              <tr v-if="!centerDetails.requests.length">
                <td colspan="5" class="table-empty">Sem solicitações para este centro de custo.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div v-if="tab === 'policies'">
      <EmptyState v-if="!policies.length" icon="settings" title="Nenhuma política configurada" message="Cadastre políticas no banco para regras automáticas." />
      <div v-else class="table-wrapper scrollable">
        <table>
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Perfil</th>
              <th>Limite padrão</th>
              <th>Máx. por transação</th>
              <th>Aprovação</th>
              <th>Centro de custo</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in policies" :key="p.id">
              <td><strong>{{ p.category }}</strong></td>
              <td>{{ p.role }}</td>
              <td>{{ formatCurrency(p.limit) }}</td>
              <td>{{ formatCurrency(p.maxPerTransaction) }}</td>
              <td>
                <span class="badge" :class="p.requiresApproval ? 'badge-warning' : 'badge-success'">
                  {{ p.requiresApproval ? 'Obrigatória' : 'Automática' }}
                </span>
              </td>
              <td>{{ p.costCenter }}</td>
              <td><StatusBadge :status="p.status" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { api } from '../api'
import { useToast } from '../toast'
import PageHeader from '../components/PageHeader.vue'
import KpiCard from '../components/KpiCard.vue'
import StatusBadge from '../components/StatusBadge.vue'
import EmptyState from '../components/EmptyState.vue'
import Icon from '../components/Icon.vue'

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

const usageBadge = (pct) => {
  if (pct > 100) return 'badge-danger'
  if (pct > 80) return 'badge-warning'
  return 'badge-success'
}

const load = async () => {
  try {
    const q = `month=${period.value.month}&year=${period.value.year}`
    const [policyData, executiveData] = await Promise.all([
      api.get('/rh/policies/summary'),
      api.get(`/executive/overview?${q}`)
    ])
    summary.value = policyData.summary
    policies.value = policyData.policies
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
</style>
