<template>
  <div class="container">
    <PageHeader
      title="Realocar créditos entre categorias"
      subtitle="Mova valor disponível da categoria de origem para a destino, respeitando os tetos definidos pelo RH."
      eyebrow="Operação flex"
    />

    <div class="grid cols-2">
      <div class="card">
        <h3 class="card-title">
          <span class="title-with-icon">
            <span class="icon-bg sm"><Icon name="swap" :size="14" /></span>
            Detalhes da realocação
          </span>
        </h3>

        <div class="form-row">
          <div class="form-group">
            <label>Categoria de origem</label>
            <select v-model="form.fromCategory">
              <option v-for="c in activeCategories" :key="'o-' + c.id" :value="c.nome">
                {{ c.nome }} (teto {{ formatCurrency(c.limite) }})
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>Categoria de destino</label>
            <select v-model="form.toCategory">
              <option v-for="c in activeCategories" :key="'d-' + c.id" :value="c.nome">
                {{ c.nome }} (teto {{ formatCurrency(c.limite) }})
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

        <button
          class="btn btn-primary btn-block mt-3"
          :disabled="submitDisabled || !auth.can('credit_reallocate') || loading"
          @click="submit"
        >
          <Icon v-if="loading" name="spinner" :size="14" class="spin" />
          <Icon v-else name="swap" :size="14" />
          <span v-if="!loading">Confirmar realocação de {{ formatCurrency(form.valor || 0) }}</span>
          <span v-else>Processando…</span>
        </button>
        <p v-if="!auth.can('credit_reallocate')" class="field-help text-center mt-2">
          Seu perfil não tem permissão para realocar créditos.
        </p>
      </div>

      <div class="stack">
        <div class="card">
          <h3 class="card-title">
            <span class="title-with-icon">
              <span class="icon-bg sm success"><Icon name="dollar-sign" :size="14" /></span>
              Saldos por categoria
            </span>
            <button type="button" class="btn btn-ghost btn-sm" :disabled="balancesLoading" @click="reloadBalances">
              <Icon :name="balancesLoading ? 'spinner' : 'refresh'" :size="12" :class="balancesLoading ? 'spin' : ''" />
            </button>
          </h3>
          <p v-if="balancesLoading" class="muted text-sm">Carregando saldos…</p>
          <EmptyState
            v-else-if="!balanceRows.length"
            icon="layers"
            title="Sem créditos alocados"
            message="Peça ao RH/Financeiro para alocar créditos em Alocar créditos antes de realocar."
          />
          <ul v-else class="balance-mini-list">
            <li v-for="row in balanceRows" :key="row.categoria">
              <span>{{ row.categoria }}</span>
              <strong>{{ formatCurrency(row.saldo) }}</strong>
            </li>
          </ul>
        </div>

        <div class="card">
          <h3 class="card-title">
            <span class="title-with-icon">
              <span class="icon-bg sm info"><Icon name="eye" :size="14" /></span>
              Pré-visualização
            </span>
          </h3>
          <div class="preview-row">
            <span class="muted">Saldo na origem ({{ form.fromCategory || '—' }})</span>
            <strong>{{ formatCurrency(balFrom) }}</strong>
          </div>
          <div class="preview-row">
            <span class="muted">Saldo na destino atual ({{ form.toCategory || '—' }})</span>
            <strong>{{ formatCurrency(balTo) }}</strong>
          </div>
          <div class="preview-row">
            <span class="muted">Valor da realocação</span>
            <strong>{{ formatCurrency(form.valor || 0) }}</strong>
          </div>
          <div class="preview-row total">
            <span class="muted">Saldo na destino após</span>
            <strong style="color: var(--brand-accent)">
              {{ formatCurrency(destAfter) }}
            </strong>
          </div>
        </div>

        <div v-if="warningMessage" class="notice" :class="warningType">
          <Icon class="notice-icon" name="alert-triangle" :size="18" />
          <span>{{ warningMessage }}</span>
        </div>

        <div class="card muted-bg">
          <h4 class="mb-2">Como funciona</h4>
          <ul class="info-list">
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
import PageHeader from '../components/PageHeader.vue'
import EmptyState from '../components/EmptyState.vue'
import Icon from '../components/Icon.vue'

const router = useRouter()
const {
  createReallocation,
  loadMine,
  loadMyBalances,
  categoryBalance,
  balancesByCategory
} = useTransactions()
const { categories, loadCategories } = useCategories()
const auth = useAuth()
const { showToast } = useToast()

const loading = ref(false)
const balancesLoading = ref(false)

const reloadBalances = async () => {
  balancesLoading.value = true
  try {
    await loadMyBalances()
  } catch (e) {
    showToast(e.message || 'Falha ao carregar saldos.', 'error')
  } finally {
    balancesLoading.value = false
  }
}

const pickDefaultCategories = () => {
  const rows = balanceRows.value.filter((r) => r.saldo > 0)
  if (!rows.length) return
  const best = rows.reduce((a, b) => (b.saldo > a.saldo ? b : a))
  form.fromCategory = best.categoria
  const dest = rows.find((r) => r.categoria !== form.fromCategory) || rows[0]
  if (dest && dest.categoria !== form.fromCategory) {
    form.toCategory = dest.categoria
  }
}

onMounted(async () => {
  balancesLoading.value = true
  try {
    await loadCategories()
    await loadMine()
    await loadMyBalances()
    pickDefaultCategories()
    if (!balanceRows.value.some((r) => r.saldo > 0)) {
      showToast(
        'Nenhum saldo disponível. Peça ao RH para alocar créditos ou confira se o backend foi reiniciado.',
        'error'
      )
    }
  } catch (e) {
    showToast(e.message || 'Falha ao carregar dados para realocação.', 'error')
  } finally {
    balancesLoading.value = false
  }
})

const form = reactive({ fromCategory: '', toCategory: '', valor: null, descricao: '' })

const activeCategories = computed(() => categories.value.filter((c) => c.status !== 'Inativa'))

watch(activeCategories, (list) => {
  if (!list.length) return
  if (!list.some((c) => c.nome === form.fromCategory)) {
    pickDefaultCategories()
    if (!form.fromCategory) form.fromCategory = list[0].nome
  }
  if (!list.some((c) => c.nome === form.toCategory) || form.toCategory === form.fromCategory) {
    const alt = list.find((c) => c.nome !== form.fromCategory)
    form.toCategory = alt ? alt.nome : list[0].nome
  }
})

const balanceRows = computed(() =>
  Object.entries(balancesByCategory.value)
    .map(([categoria, row]) => ({ categoria, saldo: row.saldo, limite: row.limite }))
    .filter((r) => r.saldo > 0 || r.limite > 0)
    .sort((a, b) => b.saldo - a.saldo)
)

const balFrom = computed(() => categoryBalance(form.fromCategory))
const balTo = computed(() => categoryBalance(form.toCategory))

const destAfter = computed(() => balTo.value + (form.valor || 0))

const warningMessage = computed(() => {
  const v = Number(form.valor) || 0
  if (form.fromCategory && form.toCategory && form.fromCategory === form.toCategory) {
    return 'Origem e destino precisam ser categorias diferentes.'
  }
  if (v > 0 && balFrom.value < v) {
    return `Saldo insuficiente na origem. Disponível: ${formatCurrency(balFrom.value)}.`
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
  return false
})

const formatCurrency = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

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
    await reloadBalances()
    router.push('/transacoes')
  } catch (e) {
    showToast(e.message || 'Erro ao realocar.', 'error')
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
.balance-mini-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.balance-mini-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.45rem 0.6rem;
  background: var(--surface-soft);
  border-radius: var(--radius-xs);
  font-size: 0.85rem;
}
</style>
