<template>
  <div class="container">
    <PageHeader
      title="Carga mensal de créditos"
      subtitle="Credite cada colaborador ativo com o valor efetivo por categoria (respeitando políticas e tetos)."
      eyebrow="Operação RH"
    >
      <template #actions>
        <button class="btn btn-secondary" type="button" :disabled="previewLoading" @click="loadPreview()">
          <Icon :name="previewLoading ? 'spinner' : 'refresh'" :size="14" :class="previewLoading ? 'spin' : ''" />
          Atualizar
        </button>
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

    <div class="grid cols-4 mb-3">
      <KpiCard label="Colaboradores ativos" :value="preview?.collaborators ?? 0" tone="info" icon="users" />
      <KpiCard label="Categorias ativas" :value="preview?.categories ?? 0" tone="success" icon="layers" />
      <KpiCard label="Lançamentos previstos" :value="preview?.entriesCount ?? 0" tone="warning" icon="activity" />
      <KpiCard label="Valor total previsto" :value="preview?.totalAmount ?? 0" format="currency" tone="info" icon="dollar-sign" />
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
        <span class="muted text-xs">
          {{ preview?.categories ?? 0 }} categoria(s) · {{ preview?.collaborators ?? 0 }} colaborador(es)
        </span>
      </h3>
      <EmptyState
        v-if="!categoryRows.length && !previewLoading"
        icon="layers"
        title="Nenhuma categoria ativa"
        message="Habilite categorias em Categorias & Limites."
      />
      <div v-else-if="previewLoading" class="muted text-center" style="padding: 2rem;">
        <Icon name="spinner" :size="16" class="spin" /> Calculando preview…
      </div>
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
              <td>{{ formatCurrency(row.perCollaborator) }}</td>
              <td>{{ row.collaborators }}</td>
              <td><strong>{{ formatCurrency(row.categoryTotal) }}</strong></td>
            </tr>
            <tr class="total-row">
              <td><strong>Total geral</strong></td>
              <td>—</td>
              <td>{{ preview?.entriesCount ?? 0 }} lanç.</td>
              <td><strong>{{ formatCurrency(preview?.totalAmount ?? 0) }}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '../api'
import { useToast } from '../toast'
import { useConfirm } from '../confirm'
import { useAuth } from '../auth'
import { useTransactions } from '../transactions'
import PageHeader from '../components/PageHeader.vue'
import KpiCard from '../components/KpiCard.vue'
import EmptyState from '../components/EmptyState.vue'
import Icon from '../components/Icon.vue'

const { showToast } = useToast()
const { confirm } = useConfirm()
const auth = useAuth()
const { applyMonthlyCategoryCredits } = useTransactions()

const loading = ref(false)
const previewLoading = ref(false)
const preview = ref(null)

const loadPreview = async (quiet = false) => {
  previewLoading.value = true
  try {
    preview.value = await api.get('/admin/monthly-load/preview')
    if (!quiet) showToast('Preview da carga atualizado.')
  } catch (e) {
    showToast(e.message || 'Falha ao carregar preview.', 'error')
  } finally {
    previewLoading.value = false
  }
}

onMounted(() => loadPreview(true))

const categoryRows = computed(() => preview.value?.categoryRows || [])

const canRun = computed(
  () => (preview.value?.collaborators || 0) > 0 && (preview.value?.categories || 0) > 0
)

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
  const ok = await confirm({
    title: 'Executar carga mensal',
    message: `Gerar créditos para ${preview.value.collaborators} colaborador(es) em ${preview.value.categories} categoria(s)?`,
    detail: `Total previsto: ${formatCurrency(preview.value.totalAmount)} (${preview.value.entriesCount} lançamentos).`,
    confirmLabel: 'Executar carga',
    variant: 'warning'
  })
  if (!ok) return

  loading.value = true
  try {
    const created = await applyMonthlyCategoryCredits()
    showToast(`Carga concluída: ${created} crédito(s) registrado(s).`)
    await loadPreview()
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
