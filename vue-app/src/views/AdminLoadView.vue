<template>
  <div class="container">
    <PageHeader
      title="Carga mensal de créditos"
      subtitle="Credite cada colaborador ativo com o valor configurado em cada categoria do programa flex."
    >
      <template #actions>
        <button class="btn btn-secondary" type="button" @click="simulateUpload">↑ Simular CSV</button>
        <button
          class="btn btn-primary"
          type="button"
          :disabled="loading || !canRun || !auth.can('monthly_load_run')"
          @click="handleCarga"
        >
          <span v-if="!loading">Executar carga agora</span>
          <span v-else>Processando…</span>
        </button>
      </template>
    </PageHeader>

    <div class="grid cols-3 mb-3">
      <KpiCard label="Colaboradores ativos" :value="activeCollaboratorsCount" tone="info" hint="Recebem créditos na carga." />
      <KpiCard label="Categorias ativas" :value="activeCategoriesCount" tone="success" hint="Uma entrada por categoria." />
      <KpiCard label="Lançamentos previstos" :value="creditsPreviewCount" tone="warning" hint="Total de transações de Entrada." />
    </div>

    <div v-if="!canRun" class="notice warning">
      <span>⚠</span>
      <span>Cadastre ao menos um colaborador ativo e uma categoria ativa para executar a carga.</span>
    </div>

    <div v-if="!auth.can('monthly_load_run')" class="notice info">
      <span>ℹ</span>
      <span>Apenas administradores podem executar a carga.</span>
    </div>

    <div class="card">
      <h3 class="card-title">
        <span>Resumo por categoria</span>
        <span class="muted" style="font-size: 0.8rem;">{{ activeCategoriesCount }} categoria(s) · {{ activeCollaboratorsCount }} colaborador(es)</span>
      </h3>
      <EmptyState v-if="!categoryRows.length" icon="▤" title="Nenhuma categoria ativa" message="Habilite categorias em Categorias & Limites." />
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
              <td>R$ {{ row.limite.toFixed(2) }}</td>
              <td>{{ activeCollaboratorsCount }}</td>
              <td><strong>R$ {{ row.totalEstimado.toFixed(2) }}</strong></td>
            </tr>
            <tr style="background: var(--surface-soft);">
              <td><strong>Total</strong></td>
              <td>—</td>
              <td>{{ activeCollaboratorsCount }}</td>
              <td><strong>R$ {{ totalAll.toFixed(2) }}</strong></td>
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

const simulateUpload = () => {
  showToast(
    `Validação simulada: ${activeCollaboratorsCount.value} colaborador(es) ativo(s) elegíveis.`,
    'info'
  )
}
</script>
