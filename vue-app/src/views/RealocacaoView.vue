<template>
  <div class="container">
    <PageHeader
      title="Realocar créditos entre categorias"
      subtitle="Mova valor disponível da categoria de origem para a destino, respeitando os tetos definidos pelo RH."
    />

    <div class="grid cols-2">
      <div class="card">
        <h3 class="card-title">Detalhes da realocação</h3>

        <div class="form-row">
          <div class="form-group">
            <label>Categoria de origem</label>
            <select v-model="form.fromCategory">
              <option v-for="c in activeCategories" :key="'o-' + c.id" :value="c.nome">
                {{ c.nome }} (teto R$ {{ Number(c.limite).toFixed(2) }})
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>Categoria de destino</label>
            <select v-model="form.toCategory">
              <option v-for="c in activeCategories" :key="'d-' + c.id" :value="c.nome">
                {{ c.nome }} (teto R$ {{ Number(c.limite).toFixed(2) }})
              </option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>Valor a realocar (R$) <span class="req">*</span></label>
          <input v-model.number="form.valor" type="number" min="0.01" step="0.01" placeholder="0,00" />
        </div>

        <div class="form-group">
          <label>Observação (opcional)</label>
          <textarea v-model="form.descricao" rows="3" placeholder="Ex.: priorizar saúde neste mês" />
        </div>

        <div class="actions" style="margin-top: 1rem;">
          <button
            class="btn btn-primary btn-block"
            :disabled="submitDisabled || !auth.can('credit_reallocate') || loading"
            @click="submit"
          >
            <span v-if="!loading">Confirmar realocação de R$ {{ (form.valor || 0).toFixed(2) }}</span>
            <span v-else>Processando…</span>
          </button>
        </div>
        <p v-if="!auth.can('credit_reallocate')" class="field-help" style="text-align: center; margin-top: 0.5rem;">
          Seu perfil não tem permissão para realocar créditos.
        </p>
      </div>

      <div class="stack">
        <div class="card">
          <h3 class="card-title">Pré-visualização</h3>
          <div class="preview-row">
            <span class="muted">Saldo na origem ({{ form.fromCategory || '-' }})</span>
            <strong>R$ {{ balFrom.toFixed(2) }}</strong>
          </div>
          <div class="preview-row">
            <span class="muted">Saldo na destino atual ({{ form.toCategory || '-' }})</span>
            <strong>R$ {{ balTo.toFixed(2) }}</strong>
          </div>
          <div class="preview-row">
            <span class="muted">Valor da realocação</span>
            <strong>R$ {{ (form.valor || 0).toFixed(2) }}</strong>
          </div>
          <div class="preview-row total">
            <span class="muted">Saldo na destino após</span>
            <strong :style="{ color: destAfter > destTeto ? 'var(--brand-danger)' : 'var(--brand-accent)' }">
              R$ {{ destAfter.toFixed(2) }} / teto R$ {{ destTeto.toFixed(2) }}
            </strong>
          </div>
        </div>

        <div v-if="warningMessage" class="notice" :class="warningType">
          <span>⚠</span>
          <span>{{ warningMessage }}</span>
        </div>

        <div class="card muted-bg">
          <h4 style="margin-bottom: 0.5rem;">Como funciona</h4>
          <ul style="padding-left: 1.1rem; color: var(--text-muted); font-size: 0.85rem; line-height: 1.6;">
            <li>O valor é movido entre suas próprias categorias do mês corrente.</li>
            <li>O teto da categoria de destino é definido pelo RH.</li>
            <li>Se a política exigir aprovação, a operação ficará "Em análise" até decisão do gestor.</li>
            <li>Toda realocação é auditável e visível em <RouterLink class="link" to="/transacoes">Transações</RouterLink>.</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed, watch, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useTransactions } from '../transactions'
import { useCategories } from '../categories'
import { useAuth } from '../auth'
import { useToast } from '../toast'
import { balanceForCategory } from '../services/transactionService'
import PageHeader from '../components/PageHeader.vue'

const router = useRouter()
const { createReallocation, allTransactions, loadMine } = useTransactions()
const { categories, loadCategories } = useCategories()
const auth = useAuth()
const { showToast } = useToast()

const loading = ref(false)

onMounted(async () => {
  await Promise.allSettled([loadMine(), loadCategories()])
})

const form = reactive({ fromCategory: '', toCategory: '', valor: null, descricao: '' })

const activeCategories = computed(() => categories.value.filter((c) => c.status !== 'Inativa'))

watch(
  activeCategories,
  (list) => {
    if (!list.length) return
    if (!list.some((c) => c.nome === form.fromCategory)) form.fromCategory = list[0].nome
    if (!list.some((c) => c.nome === form.toCategory) || form.toCategory === form.fromCategory) {
      const alt = list.find((c) => c.nome !== form.fromCategory)
      form.toCategory = alt ? alt.nome : list[0].nome
    }
  },
  { immediate: true }
)

const email = computed(() => auth.user.value?.email || '')

const balFrom = computed(() => balanceForCategory(allTransactions.value, email.value, form.fromCategory))
const balTo = computed(() => balanceForCategory(allTransactions.value, email.value, form.toCategory))

const destCat = computed(() => activeCategories.value.find((c) => c.nome === form.toCategory))
const destTeto = computed(() => Number(destCat.value?.limite || 0))
const destAfter = computed(() => balTo.value + (form.valor || 0))

const warningMessage = computed(() => {
  const v = Number(form.valor) || 0
  if (form.fromCategory && form.toCategory && form.fromCategory === form.toCategory) {
    return 'Origem e destino precisam ser categorias diferentes.'
  }
  if (v > 0 && balFrom.value < v) {
    return `Saldo insuficiente na origem. Disponível: R$ ${balFrom.value.toFixed(2)}.`
  }
  if (v > 0 && destAfter.value > destTeto.value) {
    return `Operação ultrapassaria o teto da categoria destino (R$ ${destTeto.value.toFixed(2)}).`
  }
  return ''
})
const warningType = computed(() => 'danger')

const submitDisabled = computed(() => {
  const v = Number(form.valor)
  if (!v || v <= 0) return true
  if (!form.fromCategory || !form.toCategory) return true
  if (form.fromCategory === form.toCategory) return true
  if (balFrom.value < v) return true
  if (destAfter.value > destTeto.value) return true
  return false
})

const submit = async () => {
  if (loading.value) return
  if (!auth.can('credit_reallocate')) {
    showToast('Seu perfil não possui permissão para realocação.', 'error')
    return
  }
  loading.value = true
  try {
    await createReallocation({
      fromCategory: form.fromCategory,
      toCategory: form.toCategory,
      valor: Number(form.valor),
      descricao: form.descricao?.trim() || ''
    })
    showToast('Realocação registrada com sucesso.')
    form.valor = null
    form.descricao = ''
    router.push('/transacoes')
  } catch (e) {
    showToast(e.message || 'Erro ao realocar.', 'error')
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
