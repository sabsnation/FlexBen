<template>
  <div class="container">
    <PageHeader
      title="Registrar utilização"
      subtitle="Lance uma saída de crédito em uma categoria. Conforme política, pode exigir aprovação gerencial."
    />

    <div class="grid cols-2">
      <div class="card">
        <h3 class="card-title">Detalhes da utilização</h3>
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
          class="btn btn-primary btn-block"
          :disabled="submitDisabled || !auth.can('usage_register') || loading"
          @click="submit"
        >
          <span v-if="!loading">Registrar saída de R$ {{ (form.valor || 0).toFixed(2) }}</span>
          <span v-else>Processando…</span>
        </button>
        <p v-if="!auth.can('usage_register')" class="field-help" style="text-align: center; margin-top: 0.5rem;">
          Seu perfil não tem permissão para registrar utilização.
        </p>
      </div>

      <div class="stack">
        <div class="card">
          <h3 class="card-title">Pré-visualização</h3>
          <div class="preview-row">
            <span class="muted">Categoria selecionada</span>
            <strong>{{ form.categoria || '-' }}</strong>
          </div>
          <div class="preview-row">
            <span class="muted">Saldo atual da categoria</span>
            <strong>R$ {{ currentBal.toFixed(2) }}</strong>
          </div>
          <div class="preview-row">
            <span class="muted">Valor a debitar</span>
            <strong>R$ {{ (form.valor || 0).toFixed(2) }}</strong>
          </div>
          <div class="preview-row total">
            <span class="muted">Saldo após o lançamento</span>
            <strong :style="{ color: after < 0 ? 'var(--brand-danger)' : 'var(--brand-accent)' }">
              R$ {{ after.toFixed(2) }}
            </strong>
          </div>
        </div>

        <div v-if="after < 0" class="notice danger">
          <span>⚠</span>
          <span>Saldo insuficiente: o lançamento ultrapassaria o disponível na categoria.</span>
        </div>

        <div class="card muted-bg">
          <h4 style="margin-bottom: 0.5rem;">Sobre as utilizações</h4>
          <ul style="padding-left: 1.1rem; color: var(--text-muted); font-size: 0.85rem; line-height: 1.6;">
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
import { balanceForCategory } from '../services/transactionService'
import PageHeader from '../components/PageHeader.vue'

const router = useRouter()
const { categories, loadCategories } = useCategories()
const { registerUsage, loadMine, allTransactions } = useTransactions()
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
  await Promise.allSettled([loadCategories(), loadMine()])
})

const email = computed(() => auth.user.value?.email || '')
const currentBal = computed(() => balanceForCategory(allTransactions.value, email.value, form.categoria))
const after = computed(() => currentBal.value - (form.valor || 0))

const submitDisabled = computed(() => {
  const v = Number(form.valor) || 0
  if (!v || v <= 0) return true
  if (after.value < 0) return true
  return false
})

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
.preview-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 0;
  border-bottom: 1px dashed var(--border-light);
}
.preview-row:last-child { border-bottom: none; }
.preview-row.total { padding-top: 0.85rem; border-bottom: none; border-top: 2px solid var(--border-light); }
</style>
