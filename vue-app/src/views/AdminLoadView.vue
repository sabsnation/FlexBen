<template>
  <div class="container">
    <PageHeader
      title="Carga mensal de créditos"
      subtitle="Credite cada colaborador ativo com o valor configurado em cada categoria do programa flex."
      eyebrow="Operação RH"
    >
      <template #actions>
        <button
          class="btn btn-primary"
          type="button"
          :disabled="loading || !canRun || !auth.can('monthly_load_run')"
          @click="handleCarga"
        >
          <Icon v-if="loading" name="spinner" :size="14" class="spin" />
          <Icon v-else name="zap" :size="14" />
          <span v-if="!loading">Executar carga agora</span>
          <span v-else>Processando…</span>
        </button>
      </template>
    </PageHeader>

    <div class="grid cols-3 mb-3">
      <KpiCard label="Colaboradores ativos" :value="activeCollaboratorsCount" tone="info" icon="users" hint="Recebem créditos na carga." />
      <KpiCard label="Categorias ativas" :value="activeCategoriesCount" tone="success" icon="layers" hint="Uma entrada por categoria." />
      <KpiCard label="Lançamentos previstos" :value="creditsPreviewCount" tone="warning" icon="activity" hint="Total de transações de Entrada." />
    </div>

    <div v-if="!canRun" class="notice warning">
      <Icon class="notice-icon" name="alert-triangle" :size="18" />
      <span>Cadastre ao menos um colaborador ativo e uma categoria ativa para executar a carga.</span>
    </div>

    <div v-if="!auth.can('monthly_load_run')" class="notice info">
      <Icon class="notice-icon" name="info" :size="18" />
      <span>Apenas administradores podem executar a carga em massa.</span>
    </div>

    <div class="notice info mb-3">
      <Icon class="notice-icon" name="info" :size="18" />
      <span>
        Para creditar um colaborador específico, use
        <RouterLink to="/alocar-creditos">Alocar créditos</RouterLink>
        (RH/Admin e Financeiro).
      </span>
    </div>

    <div class="card">
      <h3 class="card-title">
        <span class="title-with-icon">
          <span class="icon-bg sm"><Icon name="bar-chart" :size="14" /></span>
          Resumo por categoria
        </span>
        <span class="muted text-xs">{{ activeCategoriesCount }} categoria(s) · {{ activeCollaboratorsCount }} colaborador(es)</span>
      </h3>
      <EmptyState v-if="!categoryRows.length" icon="layers" title="Nenhuma categoria ativa" message="Habilite categorias em Categorias & Limites." />
      <div v-else class="table-wrapper" style="border: none; box-shadow: none;">
        <table>
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Valor por colaborador</th>
              <th>Colaboradores</th>
              <th>Total da categoria</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in categoryRows" :key="row.nome">
              <td><strong>{{ row.nome }}</strong></td>
              <td>{{ formatCurrency(row.limite) }}</td>
              <td>{{ activeCollaboratorsCount }}</td>
              <td><strong>{{ formatCurrency(row.totalEstimado) }}</strong></td>
            </tr>
            <tr class="total-row">
              <td><strong>Total</strong></td>
              <td>—</td>
              <td>{{ activeCollaboratorsCount }}</td>
              <td><strong>{{ formatCurrency(totalAll) }}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from '../toast'
import { useAuth } from '../auth'
import { useCategories } from '../categories'
import { useTransactions } from '../transactions'
import PageHeader from '../components/PageHeader.vue'
import KpiCard from '../components/KpiCard.vue'
import EmptyState from '../components/EmptyState.vue'
import Icon from '../components/Icon.vue'

const { showToast } = useToast()
const auth = useAuth()
const { allRegisteredUsers, loadUsers } = auth
const { categories, loadCategories } = useCategories()
const { applyMonthlyCategoryCredits } = useTransactions()

const loading = ref(false)

onMounted(async () => {
  await Promise.allSettled([loadUsers(), loadCategories()])
})

const activeCollaborators = computed(() =>
  allRegisteredUsers.value.filter((u) => u.role === 'colaborador' && u.status === 'Ativo')
)
const activeCollaboratorsCount = computed(() => activeCollaborators.value.length)

const activeCategories = computed(() => categories.value.filter((c) => c.status !== 'Inativa'))
const activeCategoriesCount = computed(() => activeCategories.value.length)

const creditsPreviewCount = computed(() => activeCollaboratorsCount.value * activeCategoriesCount.value)

const canRun = computed(() => activeCollaboratorsCount.value > 0 && activeCategoriesCount.value > 0)

const categoryRows = computed(() => {
  const n = activeCollaboratorsCount.value
  return activeCategories.value.map((c) => {
    const limite = Number(c.limite)
    return { nome: c.nome, limite, totalEstimado: limite * n }
  })
})

const totalAll = computed(() => categoryRows.value.reduce((s, r) => s + r.totalEstimado, 0))

const formatCurrency = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const handleCarga = async () => {
  if (!canRun.value) {
    showToast('Não há colaboradores ou categorias suficientes.', 'error')
    return
  }
  if (!auth.can('monthly_load_run')) {
    showToast('Seu perfil não possui permissão para executar a carga.', 'error')
    return
  }
  const msg = `Gerar créditos para ${activeCollaboratorsCount.value} colaborador(es) em ${activeCategoriesCount.value} categoria(s) (${creditsPreviewCount.value} lançamentos)?`
  if (!confirm(msg)) return

  loading.value = true
  try {
    const created = await applyMonthlyCategoryCredits()
    showToast(`Carga concluída: ${created} crédito(s) registrado(s).`)
  } catch (e) {
    showToast(e.message || 'Falha ao processar a carga.', 'error')
  } finally {
    loading.value = false
  }
}

</script>

<style scoped>
.title-with-icon { display: inline-flex; align-items: center; gap: 10px; }
.total-row td {
  background: var(--surface-soft);
  border-top: 2px solid var(--border-light);
  font-weight: 700;
}
</style>
