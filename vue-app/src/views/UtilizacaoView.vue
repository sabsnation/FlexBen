<template>
  <div class="container">
    <PageHeader
      title="Registrar utilização"
      subtitle="Lance uma saída de crédito em uma categoria. Conforme política, pode exigir aprovação gerencial."
      eyebrow="Operação flex"
    />

    <div class="grid cols-2">
      <div class="card">
        <h3 class="card-title">
          <span class="title-with-icon">
            <span class="icon-bg sm warning"><Icon name="send" :size="14" /></span>
            Detalhes da utilização
          </span>
        </h3>

        <div class="form-group">
          <label>Categoria <span class="req">*</span></label>
          <select v-model="form.categoria">
            <option v-for="c in activeCategories" :key="c.id" :value="c.nome">{{ c.nome }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>Valor (R$) <span class="req">*</span></label>
          <input v-model.number="form.valor" type="number" min="0.01" step="0.01" placeholder="0,00" />
        </div>
        <div class="form-group">
          <label>Descrição</label>
          <textarea v-model="form.descricao" rows="3" placeholder="Ex.: curso online — comprovante interno" />
        </div>

        <button
          class="btn btn-primary btn-block mt-3"
          :disabled="submitDisabled || !auth.can('usage_register') || loading"
          @click="submit"
        >
          <Icon v-if="loading" name="spinner" :size="14" class="spin" />
          <Icon v-else name="send" :size="14" />
          <span v-if="!loading">Registrar saída de {{ formatCurrency(form.valor || 0) }}</span>
          <span v-else>Processando…</span>
        </button>
        <p v-if="!auth.can('usage_register')" class="field-help text-center mt-2">
          Seu perfil não tem permissão para registrar utilização.
        </p>
      </div>

      <div class="stack">
        <div class="card">
          <h3 class="card-title">
            <span class="title-with-icon">
              <span class="icon-bg sm info"><Icon name="eye" :size="14" /></span>
              Pré-visualização
            </span>
          </h3>
          <div class="preview-row">
            <span class="muted">Categoria selecionada</span>
            <strong>{{ form.categoria || '—' }}</strong>
          </div>
          <div class="preview-row">
            <span class="muted">Saldo atual da categoria</span>
            <strong>{{ formatCurrency(currentBal) }}</strong>
          </div>
          <div class="preview-row">
            <span class="muted">Valor a debitar</span>
            <strong>{{ formatCurrency(form.valor || 0) }}</strong>
          </div>
          <div class="preview-row total">
            <span class="muted">Saldo após o lançamento</span>
            <strong :style="{ color: after < 0 ? 'var(--brand-danger)' : 'var(--brand-accent)' }">
              {{ formatCurrency(after) }}
            </strong>
          </div>
        </div>

        <div v-if="after < 0" class="notice danger">
          <Icon class="notice-icon" name="alert-triangle" :size="18" />
          <span>Saldo insuficiente: o lançamento ultrapassaria o disponível na categoria.</span>
        </div>

        <div class="card muted-bg">
          <h4 class="mb-2">Sobre as utilizações</h4>
          <ul class="info-list">
            <li>O lançamento é debitado do saldo da categoria escolhida.</li>
            <li>Conforme a política, o registro pode ficar "Em análise" para decisão do gestor.</li>
            <li>Acompanhe o status na tela de <RouterLink class="link" to="/transacoes">Transações</RouterLink>.</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed, watch, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCategories } from '../categories'
import { useTransactions } from '../transactions'
import { useAuth } from '../auth'
import { useToast } from '../toast'
import PageHeader from '../components/PageHeader.vue'
import Icon from '../components/Icon.vue'

const router = useRouter()
const { categories, loadCategories } = useCategories()
const { registerUsage, loadMine, loadMyBalances, categoryBalance } = useTransactions()
const auth = useAuth()
const { showToast } = useToast()

const form = reactive({ categoria: '', valor: null, descricao: '' })
const loading = ref(false)

const activeCategories = computed(() => categories.value.filter((c) => c.status !== 'Inativa'))

watch(
  activeCategories,
  (list) => {
    if (!list.length) return
    if (!list.some((c) => c.nome === form.categoria)) form.categoria = list[0].nome
  },
  { immediate: true }
)

onMounted(async () => {
  await Promise.allSettled([loadCategories(), loadMine(), loadMyBalances()])
})

const currentBal = computed(() => categoryBalance(form.categoria))
const after = computed(() => currentBal.value - (form.valor || 0))

const submitDisabled = computed(() => {
  const v = Number(form.valor) || 0
  if (!v || v <= 0) return true
  if (after.value < 0) return true
  return false
})

const formatCurrency = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const submit = async () => {
  if (loading.value) return
  if (!auth.can('usage_register')) {
    showToast('Seu perfil não possui permissão para registrar utilização.', 'error')
    return
  }
  loading.value = true
  try {
    await registerUsage({
      categoria: form.categoria,
      valor: Number(form.valor),
      descricao: form.descricao?.trim() || ''
    })
    showToast('Utilização registrada.')
    form.valor = null
    form.descricao = ''
    router.push('/transacoes')
  } catch (e) {
    showToast(e.message || 'Erro ao registrar.', 'error')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.title-with-icon { display: inline-flex; align-items: center; gap: 10px; }
.preview-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.7rem 0;
  border-bottom: 1px dashed var(--border-subtle);
  gap: 1rem;
}
.preview-row:last-child { border-bottom: none; }
.preview-row.total {
  padding-top: 0.95rem;
  border-bottom: none;
  border-top: 2px solid var(--border-light);
  margin-top: 0.4rem;
}

.info-list {
  padding-left: 1.1rem;
  color: var(--text-muted);
  font-size: var(--text-sm);
  line-height: 1.65;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
</style>
