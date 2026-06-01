<template>
  <div class="container">
    <PageHeader
      title="Registrar utilização"
      subtitle="Debita crédito da categoria escolhida, dentro do saldo disponível."
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
          <CategoryBalancePicker
            v-model="form.categoria"
            :options="categoryOptions"
            empty-message="Nenhuma categoria com saldo. Peça alocação ao RH ou realoque créditos."
          />
        </div>

        <div class="form-group">
          <label>Valor (R$) <span class="req">*</span></label>
          <input
            v-model.number="form.valor"
            type="number"
            min="0.01"
            :max="maxValor"
            step="0.01"
            placeholder="0,00"
            :disabled="maxValor <= 0"
            @blur="clampValor"
          />
          <p v-if="maxValor > 0" class="field-help">
            Máximo nesta categoria: <strong>{{ formatCurrency(maxValor) }}</strong>
          </p>
          <div v-if="maxValor > 0" class="quick-amounts">
            <button type="button" class="btn btn-ghost btn-sm" @click="setFraction(0.25)">25%</button>
            <button type="button" class="btn btn-ghost btn-sm" @click="setFraction(0.5)">50%</button>
            <button type="button" class="btn btn-ghost btn-sm" @click="setFraction(1)">Total</button>
          </div>
        </div>

        <div class="form-group">
          <label>Descrição</label>
          <textarea v-model="form.descricao" rows="3" placeholder="Ex.: curso online — comprovante interno" />
        </div>

        <button
          class="btn btn-primary btn-block mt-3"
          :disabled="submitDisabled || loading"
          @click="submit"
        >
          <Icon v-if="loading" name="spinner" :size="14" class="spin" />
          <Icon v-else name="send" :size="14" />
          <span v-if="!loading">Registrar saída de {{ formatCurrency(form.valor || 0) }}</span>
          <span v-else>Processando…</span>
        </button>
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
            <span class="muted">Categoria</span>
            <strong>{{ form.categoria || '—' }}</strong>
          </div>
          <div class="preview-row">
            <span class="muted">Saldo disponível</span>
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

        <div v-if="valorExceedsBalance" class="notice danger">
          <Icon class="notice-icon" name="alert-triangle" :size="18" />
          <span>O valor não pode ser maior que o saldo disponível ({{ formatCurrency(currentBal) }}).</span>
        </div>

        <div class="card muted-bg">
          <h4 class="mb-2">Sobre as utilizações</h4>
          <ul class="info-list">
            <li>O débito usa apenas o crédito já alocado na categoria.</li>
            <li>Conforme a política, o registro pode ficar "Em análise" para o gestor.</li>
            <li>Acompanhe em <RouterLink class="link" to="/transacoes">Transações</RouterLink>.</li>
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
import { useToast } from '../toast'
import PageHeader from '../components/PageHeader.vue'
import CategoryBalancePicker from '../components/CategoryBalancePicker.vue'
import Icon from '../components/Icon.vue'
import { categoryColor } from '../config/chartTheme.js'

const router = useRouter()
const { categories, loadCategories } = useCategories()
const { registerUsage, loadMine, loadMyBalances, categoryBalance } = useTransactions()
const { showToast } = useToast()

const form = reactive({ categoria: '', valor: null, descricao: '' })
const loading = ref(false)

const activeCategories = computed(() => categories.value.filter((c) => c.status !== 'Inativa'))

const categoryOptions = computed(() =>
  activeCategories.value.map((c, i) => {
    const saldo = categoryBalance(c.nome)
    return {
      value: c.nome,
      label: c.nome,
      saldo,
      color: categoryColor(c.nome, i),
      disabled: saldo <= 0
    }
  })
)

watch(
  categoryOptions,
  (opts) => {
    const available = opts.filter((o) => !o.disabled)
    if (!available.length) {
      form.categoria = ''
      return
    }
    if (!available.some((o) => o.value === form.categoria)) {
      form.categoria = available[0].value
    }
  },
  { immediate: true }
)

onMounted(async () => {
  const results = await Promise.allSettled([
    loadCategories(),
    loadMine({ scope: 'mine' }),
    loadMyBalances()
  ])
  const failed = results.find((r) => r.status === 'rejected')
  if (failed) {
    showToast(failed.reason?.message || 'Falha ao carregar dados para utilização.', 'error')
  }
})

const currentBal = computed(() => categoryBalance(form.categoria))
const maxValor = computed(() => Math.max(0, Math.round(currentBal.value * 100) / 100))
const after = computed(() => currentBal.value - (Number(form.valor) || 0))
const valorExceedsBalance = computed(() => {
  const v = Number(form.valor) || 0
  return v > 0 && v > maxValor.value + 0.001
})

const submitDisabled = computed(() => {
  const v = Number(form.valor) || 0
  if (!form.categoria || !v || v <= 0) return true
  if (maxValor.value <= 0) return true
  if (v > maxValor.value + 0.001) return true
  return false
})

const roundMoney = (n) => Math.round(n * 100) / 100

const clampValor = () => {
  const v = Number(form.valor)
  if (!Number.isFinite(v) || v <= 0) {
    form.valor = null
    return
  }
  if (v > maxValor.value) form.valor = maxValor.value
}

const setFraction = (frac) => {
  if (maxValor.value <= 0) return
  form.valor = roundMoney(maxValor.value * frac)
}

watch(
  () => form.categoria,
  () => {
    if (form.valor != null && form.valor > maxValor.value) {
      clampValor()
    }
  }
)

const formatCurrency = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const submit = async () => {
  if (loading.value || submitDisabled.value) return
  clampValor()
  loading.value = true
  try {
    await registerUsage({
      categoria: form.categoria,
      valor: roundMoney(Number(form.valor)),
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
.quick-amounts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
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
