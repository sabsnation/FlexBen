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
        <RouterLink to="/utilizacao" class="btn btn-primary">
          <Icon name="plus" :size="14" /> Registrar uso
        </RouterLink>
      </template>
    </PageHeader>

    <div class="grid cols-4 mb-3">
      <KpiCard
        label="Saldo flex disponível"
        :value="totalBalance"
        format="currency"
        tone="success"
        icon="dollar-sign"
        :hint="`Em ${categoryCount} categoria(s)`"
      />
      <KpiCard
        label="Créditos no mês"
        :value="totalIncome"
        format="currency"
        tone="info"
        icon="arrow-down"
        :hint="`${incomeCount} crédito(s) registrado(s)`"
      />
      <KpiCard
        label="Gasto no mês"
        :value="totalExpenses"
        format="currency"
        tone="warning"
        icon="arrow-up"
        :hint="`${expenseCount} movimentação(ões) de saída`"
      />
      <KpiCard
        label="Uso do limite mensal"
        :value="usagePercentage"
        format="percent"
        :tone="usageTone"
        icon="activity"
        :hint="usageHint"
      />
    </div>

    <div class="grid cols-2 mb-3">
      <div class="card">
        <h3 class="card-title">
          <span class="card-title-with-icon">
            <span class="icon-bg sm"><Icon name="pie-chart" :size="14" /></span>
            Distribuição por categoria
          </span>
        </h3>

        <EmptyState
          v-if="categoryEntries.length === 0"
          icon="bar-chart"
          title="Sem gastos no período"
          message="Realize uma utilização para começar a visualizar a distribuição."
        />

        <div v-else class="category-list">
          <div v-for="entry in categoryEntries" :key="entry.cat" class="category-row">
            <div class="progress-label">
              <span class="strong">{{ entry.cat }}</span>
              <span>{{ formatCurrency(entry.amount) }} · {{ entry.pct.toFixed(0) }}%</span>
            </div>
            <div class="progress-bar-bg">
              <div
                class="progress-bar-fill"
                :style="{ width: entry.pct + '%', background: getCategoryColor(entry.cat) }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <h3 class="card-title">
          <span class="card-title-with-icon">
            <span class="icon-bg sm warning"><Icon name="bell" :size="14" /></span>
            Avisos e alertas
          </span>
        </h3>
        <div class="alerts-stack">
          <div v-if="usagePercentage > 80" class="alert-item danger">
            <Icon name="alert-triangle" :size="16" />
            <span>Você atingiu {{ usagePercentage.toFixed(0) }}% do limite mensal. Considere realocar para evitar bloqueios.</span>
          </div>
          <div v-if="hasPendingDecisions" class="alert-item warning">
            <Icon name="clock" :size="16" />
            <span>Você tem {{ pendingDecisionsCount }} solicitação(ões) em análise. Acompanhe pelo histórico.</span>
          </div>
          <div class="alert-item info">
            <Icon name="info" :size="16" />
            <span>Próxima carga mensal de créditos é gerada automaticamente pelo RH.</span>
          </div>
          <div v-if="!hasPendingDecisions && usagePercentage <= 80" class="alert-item success">
            <Icon name="check-circle" :size="16" />
            <span>Tudo certo! Você está dentro do orçamento planejado.</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="auth.isManager.value || auth.isAdmin.value" class="card mb-3">
      <h3 class="card-title">
        <span class="card-title-with-icon">
          <span class="icon-bg sm info"><Icon name="briefcase" :size="14" /></span>
          Visão de gestão
        </span>
        <RouterLink class="link" to="/gestor/aprovacoes">
          Ver fila completa <Icon name="arrow-right" :size="12" />
        </RouterLink>
      </h3>
      <div class="grid cols-3">
        <KpiCard label="Em análise" :value="manager.kpis.inAnalysis" tone="warning" icon="clock" />
        <KpiCard label="Aprovadas / Reprovadas" :value="`${manager.kpis.approved} / ${manager.kpis.rejected}`" tone="info" icon="check-circle" />
        <KpiCard label="SLA médio aprovação" :value="`${manager.kpis.avgApprovalHours.toFixed(1)}h`" tone="success" icon="activity" />
      </div>
    </div>

    <div v-if="auth.isAdmin.value" class="card mb-3">
      <h3 class="card-title">
        <span class="card-title-with-icon">
          <span class="icon-bg sm"><Icon name="pie-chart" :size="14" /></span>
          Visão executiva (RH)
        </span>
        <RouterLink class="link" to="/rh/politicas">
          Painel completo <Icon name="arrow-right" :size="12" />
        </RouterLink>
      </h3>
      <div class="grid cols-4">
        <KpiCard label="Previsto total" :value="executive.predictedTotal" format="currency" icon="target" />
        <KpiCard label="Realizado total" :value="executive.realizedTotal" format="currency" tone="info" icon="bar-chart" />
        <KpiCard label="Desvio" :value="executive.totalDeviation" format="currency" :tone="executive.totalDeviation > 0 ? 'danger' : 'success'" icon="trending-up" />
        <KpiCard label="Uso do orçamento" :value="executive.usagePercent" format="percent" :tone="executive.usagePercent > 100 ? 'danger' : 'success'" icon="activity" />
      </div>
    </div>

    <div v-if="auth.isFinance.value || auth.isAdmin.value" class="card mb-3">
      <h3 class="card-title">
        <span class="card-title-with-icon">
          <span class="icon-bg sm warning"><Icon name="dollar-sign" :size="14" /></span>
          Operação financeira
        </span>
        <RouterLink class="link" to="/financeiro/fechamento">
          Fechar mês <Icon name="arrow-right" :size="12" />
        </RouterLink>
      </h3>
      <div class="grid cols-3">
        <KpiCard label="Mês de referência" :value="finance.referenceMonth || '—'" icon="calendar" />
        <KpiCard label="Total aprovado" :value="finance.approvedTotal" format="currency" tone="info" icon="check-circle" />
        <KpiCard label="Itens em aberto" :value="finance.pendingCount" tone="warning" icon="clock" />
      </div>
    </div>

    <div class="card">
      <h3 class="card-title">
        <span class="card-title-with-icon">
          <span class="icon-bg sm"><Icon name="activity" :size="14" /></span>
          Atividades recentes
        </span>
        <RouterLink class="link" to="/transacoes">
          Ver histórico <Icon name="arrow-right" :size="12" />
        </RouterLink>
      </h3>

      <EmptyState
        v-if="transactions.length === 0"
        icon="inbox"
        title="Sem movimentações"
        message="Suas próximas transações aparecerão aqui."
      />

      <div v-else class="timeline">
        <div v-for="item in transactions.slice(0, 6)" :key="item.id" class="timeline-item">
          <div class="timeline-dot" :style="{ background: item.tipo === 'Saída' ? '#ef4444' : '#10b981' }"></div>
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
import { api } from '../api'
import PageHeader from '../components/PageHeader.vue'
import KpiCard from '../components/KpiCard.vue'
import EmptyState from '../components/EmptyState.vue'
import StatusBadge from '../components/StatusBadge.vue'
import Icon from '../components/Icon.vue'

const { transactions, totalBalance, loadMine } = useTransactions()
const { categories, loadCategories } = useCategories()
const auth = useAuth()

const manager = ref({ kpis: { inAnalysis: 0, approved: 0, rejected: 0, avgApprovalHours: 0 } })
const executive = ref({ predictedTotal: 0, realizedTotal: 0, totalDeviation: 0, usagePercent: 0 })
const finance = ref({ referenceMonth: '', approvedTotal: 0, pendingCount: 0 })

onMounted(async () => {
  await Promise.allSettled([loadMine(), loadCategories()])

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

const totalIncome = computed(() =>
  transactions.value.filter((t) => t.tipo === 'Entrada').reduce((acc, t) => acc + t.valor, 0)
)
const totalExpenses = computed(() =>
  transactions.value.filter((t) => t.tipo === 'Saída').reduce((acc, t) => acc + t.valor, 0)
)
const incomeCount = computed(() => transactions.value.filter((t) => t.tipo === 'Entrada').length)
const expenseCount = computed(() => transactions.value.filter((t) => t.tipo === 'Saída').length)
const categoryCount = computed(() => new Set(transactions.value.map((t) => t.categoria)).size)

const totalLimit = computed(() =>
  categories.value
    .filter((c) => c.status !== 'Inativa')
    .reduce((sum, c) => sum + Number(c.limite), 0)
)
const usagePercentage = computed(() => {
  const cap = totalLimit.value
  if (!cap) return 0
  return Math.min((totalExpenses.value / cap) * 100, 100)
})
const usageTone = computed(() => {
  if (usagePercentage.value > 90) return 'danger'
  if (usagePercentage.value > 70) return 'warning'
  return 'success'
})
const usageHint = computed(() => {
  if (totalLimit.value === 0) return 'Defina categorias para acompanhar o uso.'
  return `Limite total: ${formatCurrency(totalLimit.value)}`
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

const categoryEntries = computed(() => {
  const total = totalExpenses.value || 1
  return Object.entries(categoryTotals.value)
    .map(([cat, amount]) => ({ cat, amount, pct: (amount / total) * 100 }))
    .sort((a, b) => b.amount - a.amount)
})

const pendingDecisionsCount = computed(() =>
  transactions.value.filter((t) => ['Em análise', 'Pendente'].includes(t.status)).length
)
const hasPendingDecisions = computed(() => pendingDecisionsCount.value > 0)

const formatCurrency = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const getCategoryColor = (cat) => {
  const colors = {
    Alimentação: 'linear-gradient(90deg, #f59e0b 0%, #ea580c 100%)',
    Mobilidade: 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)',
    Saúde: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
    Educação: 'linear-gradient(90deg, #6366f1 0%, #4338ca 100%)',
    Cultura: 'linear-gradient(90deg, #a855f7 0%, #7c3aed 100%)',
    'Home Office': 'linear-gradient(90deg, #ec4899 0%, #db2777 100%)',
    'Bem-estar': 'linear-gradient(90deg, #14b8a6 0%, #0d9488 100%)'
  }
  return colors[cat] || 'linear-gradient(90deg, #94a3b8 0%, #64748b 100%)'
}
</script>

<style scoped>
.card-title-with-icon {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.alerts-stack {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
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
.alert-item.info    { background: var(--brand-info-soft); color: #075985; border-color: #bae6fd; }

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
.timeline-meta {
  font-size: var(--text-xs);
}
.timeline-amount {
  font-weight: 800;
  font-size: var(--text-md);
  letter-spacing: -0.01em;
  white-space: nowrap;
}
.timeline-amount.in { color: var(--brand-accent); }
.timeline-amount.out { color: var(--text-strong); }
</style>
