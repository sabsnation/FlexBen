<template>
  <div class="container">
    <PageHeader
      :title="`Olá, ${firstName}!`"
      :subtitle="welcomeMessage"
    >
      <template #actions>
        <RouterLink to="/realocar" class="btn btn-secondary">⇄ Realocar</RouterLink>
        <RouterLink to="/utilizacao" class="btn btn-primary">+ Registrar uso</RouterLink>
      </template>
    </PageHeader>

    <div class="grid cols-4 mb-3">
      <KpiCard
        label="Saldo flex disponível"
        :value="totalBalance"
        format="currency"
        tone="success"
        :hint="`Em ${categoryCount} categoria(s)`"
      />
      <KpiCard
        label="Créditos no mês"
        :value="totalIncome"
        format="currency"
        tone="info"
        :hint="`${incomeCount} crédito(s) registrado(s)`"
      />
      <KpiCard
        label="Gasto no mês"
        :value="totalExpenses"
        format="currency"
        tone="warning"
        :hint="`${expenseCount} movimentação(ões) de saída`"
      />
      <KpiCard
        label="Uso do limite mensal"
        :value="usagePercentage"
        format="percent"
        :tone="usageTone"
        :hint="usageHint"
      />
    </div>

    <div class="grid cols-2 mb-3">
      <div class="card">
        <h3 class="card-title">Distribuição por categoria</h3>
        <div v-if="categoryEntries.length === 0">
          <EmptyState icon="▤" title="Sem gastos no período" message="Realize uma utilização para começar a visualizar a distribuição." />
        </div>
        <div v-else>
          <div v-for="entry in categoryEntries" :key="entry.cat" class="progress-container" style="margin-bottom: 1rem;">
            <div class="progress-label">
              <span style="color: var(--text-strong); font-weight: 700;">{{ entry.cat }}</span>
              <span>R$ {{ entry.amount.toFixed(2) }} · {{ entry.pct.toFixed(0) }}%</span>
            </div>
            <div class="progress-bar-bg">
              <div class="progress-bar-fill" :style="{ width: entry.pct + '%', background: getCategoryColor(entry.cat) }"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <h3 class="card-title">Avisos e alertas</h3>
        <div v-if="usagePercentage > 80" class="alert-item danger">
          <span>⚠</span>
          <span>Você atingiu {{ usagePercentage.toFixed(0) }}% do limite mensal. Considere realocar para evitar bloqueios.</span>
        </div>
        <div v-if="hasPendingDecisions" class="alert-item warning">
          <span>⏳</span>
          <span>Você tem {{ pendingDecisionsCount }} solicitação(ões) em análise. Acompanhe pelo histórico.</span>
        </div>
        <div class="alert-item info">
          <span>ℹ</span>
          <span>Próxima carga mensal de créditos é gerada automaticamente pelo RH.</span>
        </div>
        <div v-if="!hasPendingDecisions && usagePercentage <= 80" class="alert-item success">
          <span>✓</span>
          <span>Tudo certo! Você está dentro do orçamento planejado.</span>
        </div>
      </div>
    </div>

    <!-- Quadros específicos por perfil -->
    <div v-if="auth.isManager.value || auth.isAdmin.value" class="card mb-3">
      <h3 class="card-title">
        <span>Visão de gestão</span>
        <RouterLink class="link" to="/gestor/aprovacoes">Ver fila completa →</RouterLink>
      </h3>
      <div class="grid cols-3">
        <KpiCard label="Em análise" :value="manager.kpis.inAnalysis" tone="warning" />
        <KpiCard label="Aprovadas / Reprovadas" :value="`${manager.kpis.approved} / ${manager.kpis.rejected}`" tone="info" />
        <KpiCard label="SLA médio aprovação" :value="`${manager.kpis.avgApprovalHours.toFixed(1)}h`" tone="success" />
      </div>
    </div>

    <div v-if="auth.isAdmin.value" class="card mb-3">
      <h3 class="card-title">
        <span>Visão executiva (RH)</span>
        <RouterLink class="link" to="/rh/politicas">Painel completo →</RouterLink>
      </h3>
      <div class="grid cols-4">
        <KpiCard label="Previsto total" :value="executive.predictedTotal" format="currency" />
        <KpiCard label="Realizado total" :value="executive.realizedTotal" format="currency" tone="info" />
        <KpiCard label="Desvio" :value="executive.totalDeviation" format="currency" :tone="executive.totalDeviation > 0 ? 'danger' : 'success'" />
        <KpiCard label="Uso do orçamento" :value="executive.usagePercent" format="percent" :tone="executive.usagePercent > 100 ? 'danger' : 'success'" />
      </div>
    </div>

    <div v-if="auth.isFinance.value || auth.isAdmin.value" class="card mb-3">
      <h3 class="card-title">
        <span>Operação financeira</span>
        <RouterLink class="link" to="/financeiro/fechamento">Fechar mês →</RouterLink>
      </h3>
      <div class="grid cols-3">
        <KpiCard label="Mês de referência" :value="finance.referenceMonth || '—'" />
        <KpiCard label="Total aprovado" :value="finance.approvedTotal" format="currency" tone="info" />
        <KpiCard label="Itens em aberto" :value="finance.pendingCount" tone="warning" />
      </div>
    </div>

    <div class="card">
      <h3 class="card-title">
        <span>Atividades recentes</span>
        <RouterLink class="link" to="/transacoes">Ver histórico completo →</RouterLink>
      </h3>

      <EmptyState v-if="transactions.length === 0" icon="↻" title="Sem movimentações" message="Suas próximas transações aparecerão aqui." />

      <div v-else class="timeline">
        <div v-for="item in transactions.slice(0, 6)" :key="item.id" class="timeline-item">
          <div class="timeline-dot" :style="{ background: item.tipo === 'Saída' ? '#ef4444' : '#10b981' }"></div>
          <div class="timeline-content">
            <div style="display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
              <div style="flex: 1; min-width: 0;">
                <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                  <strong>{{ item.descricao || item.tipo }}</strong>
                  <StatusBadge :status="item.status" />
                </div>
                <div class="muted" style="margin-top: 2px;">{{ item.categoria }} · {{ item.data }}</div>
              </div>
              <div :style="{ fontWeight: 800, color: item.tipo === 'Entrada' ? '#10b981' : '#1e293b' }">
                {{ item.tipo === 'Saída' ? '−' : '+' }} R$ {{ item.valor.toFixed(2) }}
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
  return `Limite total: R$ ${totalLimit.value.toFixed(2)}`
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

const getCategoryColor = (cat) => {
  const colors = {
    Alimentação: '#f59e0b',
    Mobilidade: '#3b82f6',
    Saúde: '#10b981',
    Educação: '#6366f1',
    'Home Office': '#a855f7',
    'Bem-estar': '#ec4899'
  }
  return colors[cat] || '#94a3b8'
}
</script>

<style scoped>
.alert-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 0.85rem 1rem;
  border-radius: var(--radius-md);
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
  font-weight: 500;
  border: 1px solid transparent;
}
.alert-item:last-child { margin-bottom: 0; }
.alert-item.danger  { background: #fee2e2; color: #991b1b; border-color: #fecaca; }
.alert-item.warning { background: #fef9c3; color: #854d0e; border-color: #fde68a; }
.alert-item.success { background: #dcfce7; color: #166534; border-color: #bbf7d0; }
.alert-item.info    { background: #e0f2fe; color: #075985; border-color: #bae6fd; }
.alert-item span:first-child { font-weight: 800; flex-shrink: 0; }
</style>
