<template>
  <div class="container">
    <PageHeader
      title="Alocar créditos"
      subtitle="Credite valores por categoria em colaboradores ou gestores ativos — complemento à carga mensal em massa."
      eyebrow="RH / Financeiro"
    >
      <template #actions>
        <button class="btn btn-ghost" type="button" :disabled="loadingBalances" @click="refreshBalances">
          <Icon name="refresh" :size="14" /> Atualizar saldos
        </button>
        <button
          class="btn btn-primary"
          type="button"
          :disabled="!canSubmit || submitting"
          @click="handleAllocate"
        >
          <Icon v-if="submitting" name="spinner" :size="14" class="spin" />
          <Icon v-else name="zap" :size="14" />
          <span v-if="!submitting">Confirmar alocação</span>
          <span v-else>Processando…</span>
        </button>
      </template>
    </PageHeader>

    <div v-if="!auth.can('credit_allocate')" class="notice warning mb-3">
      <Icon class="notice-icon" name="alert-triangle" :size="18" />
      <span>Seu perfil não possui permissão para alocar créditos.</span>
    </div>

    <div v-else-if="loadError" class="notice danger mb-3">
      <Icon class="notice-icon" name="alert-circle" :size="18" />
      <span>{{ loadError }}</span>
    </div>

    <div class="grid cols-2 mb-3">
      <div class="card">
        <h3 class="card-title">Colaborador</h3>
        <div class="form-group">
          <label for="credit-user">Selecione quem receberá os créditos</label>
          <select
            id="credit-user"
            v-model="selectedUserId"
            :disabled="!eligibleUsers.length"
            @change="onUserChange"
          >
            <option value="">— Escolha um colaborador —</option>
            <option v-for="u in eligibleUsers" :key="u.id" :value="String(u.id)">
              {{ u.nome }} · {{ u.email }} ({{ roleLabel(u.role) }})
            </option>
          </select>
        </div>
        <EmptyState
          v-if="!eligibleUsers.length && !loadingUsers"
          icon="users"
          title="Nenhum colaborador elegível"
          message="Cadastre colaboradores ou gestores com status Ativo."
        />
      </div>

      <div class="card">
        <h3 class="card-title">Resumo</h3>
        <template v-if="selectedUser">
          <p class="muted text-sm mb-2">
            <strong>{{ selectedUser.nome }}</strong> — {{ selectedUser.email }}
          </p>
          <div class="summary-row">
            <span>Total a creditar agora</span>
            <strong>{{ formatCurrency(totalToAllocate) }}</strong>
          </div>
          <div class="summary-row">
            <span>Saldo atual (todas categorias)</span>
            <strong>{{ formatCurrency(totalCurrentBalance) }}</strong>
          </div>
        </template>
        <p v-else class="muted text-sm">Selecione um colaborador para ver saldos e definir valores.</p>
      </div>
    </div>

    <div class="card">
      <h3 class="card-title">
        <span class="title-with-icon">
          <span class="icon-bg sm"><Icon name="layers" :size="14" /></span>
          Valores por categoria
        </span>
      </h3>

      <div v-if="loadingBalances" class="skeleton-list">
        <div v-for="n in 4" :key="'sk-' + n" class="skeleton-line" />
      </div>

      <EmptyState
        v-else-if="!selectedUserId"
        icon="grid"
        title="Nenhum colaborador selecionado"
        message="Escolha um colaborador acima para carregar saldos e informar créditos."
      />

      <EmptyState
        v-else-if="!balanceRows.length"
        icon="layers"
        title="Sem categorias ativas"
        message="Habilite categorias em Categorias & Limites."
      />

      <div v-else class="table-wrapper" style="border: none; box-shadow: none;">
        <table>
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Saldo atual</th>
              <th>Limite ref.</th>
              <th>Valor a creditar</th>
              <th>Descrição (opcional)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in balanceRows" :key="row.categoria">
              <td><strong>{{ row.categoria }}</strong></td>
              <td>{{ formatCurrency(row.saldo) }}</td>
              <td class="muted">{{ formatCurrency(row.limite) }}</td>
              <td>
                <input
                  v-model.number="row.valor"
                  type="number"
                  min="0"
                  step="0.01"
                  class="input-compact"
                  placeholder="0,00"
                  :aria-label="`Valor para ${row.categoria}`"
                />
              </td>
              <td>
                <input
                  v-model="row.descricao"
                  type="text"
                  class="input-compact"
                  placeholder="Motivo da alocação"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive, watch } from 'vue'
import { useToast } from '../toast'
import { useAuth } from '../auth'
import { useCredits } from '../credits'
import PageHeader from '../components/PageHeader.vue'
import EmptyState from '../components/EmptyState.vue'
import Icon from '../components/Icon.vue'

const { showToast } = useToast()
const auth = useAuth()
const {
  eligibleUsers,
  selectedUser,
  balances,
  loadEligibleUsers,
  loadUserBalances,
  allocateCredits,
  clearSelection
} = useCredits()

const selectedUserId = ref('')
const loadError = ref('')
const loadingUsers = ref(false)
const loadingBalances = ref(false)
const submitting = ref(false)
const balanceRows = reactive([])

const roleLabel = (role) => {
  const map = { colaborador: 'Colaborador', gestor: 'Gestor' }
  return map[role] || role
}

const formatCurrency = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const syncBalanceRows = () => {
  balanceRows.splice(
    0,
    balanceRows.length,
    ...balances.value.map((b) => ({
      categoria: b.categoria,
      saldo: b.saldo,
      limite: b.limite,
      valor: null,
      descricao: ''
    }))
  )
}

watch(balances, syncBalanceRows, { deep: true })

const totalToAllocate = computed(() =>
  balanceRows.reduce((sum, r) => sum + (Number(r.valor) > 0 ? Number(r.valor) : 0), 0)
)

const totalCurrentBalance = computed(() =>
  balanceRows.reduce((sum, r) => sum + Number(r.saldo || 0), 0)
)

const canSubmit = computed(
  () =>
    auth.can('credit_allocate') &&
    selectedUserId.value &&
    totalToAllocate.value > 0 &&
    !loadingBalances.value
)

const onUserChange = async () => {
  const id = Number.parseInt(String(selectedUserId.value), 10)
  if (!Number.isFinite(id) || id <= 0) {
    clearSelection()
    balanceRows.splice(0, balanceRows.length)
    return
  }
  loadingBalances.value = true
  try {
    await loadUserBalances(id)
    syncBalanceRows()
  } catch (e) {
    showToast(e.message || 'Falha ao carregar saldos.', 'error')
    selectedUserId.value = ''
    clearSelection()
  } finally {
    loadingBalances.value = false
  }
}

const refreshBalances = async () => {
  if (!selectedUserId.value) return
  await onUserChange()
}

onMounted(async () => {
  loadingUsers.value = true
  loadError.value = ''
  try {
    await loadEligibleUsers()
  } catch (e) {
    const msg = e.message || 'Falha ao listar colaboradores.'
    loadError.value = msg
    showToast(msg, 'error')
  } finally {
    loadingUsers.value = false
  }
})

const handleAllocate = async () => {
  if (!canSubmit.value) return
  const items = balanceRows
    .filter((r) => Number(r.valor) > 0)
    .map((r) => ({
      categoria: r.categoria,
      valor: Number(r.valor),
      descricao: r.descricao?.trim() || undefined
    }))
  const msg = `Creditar ${formatCurrency(totalToAllocate.value)} em ${items.length} categoria(s) para ${selectedUser.value?.nome}?`
  if (!confirm(msg)) return

  submitting.value = true
  try {
    const { created } = await allocateCredits(Number(selectedUserId.value), items)
    showToast(`${created} crédito(s) alocado(s) com sucesso.`)
    balanceRows.forEach((r) => {
      r.valor = null
      r.descricao = ''
    })
    await onUserChange()
  } catch (e) {
    showToast(e.message || 'Falha ao alocar créditos.', 'error')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.title-with-icon {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}
.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border-light);
  font-size: 0.9rem;
}
.summary-row:last-child {
  border-bottom: none;
}
.input-compact {
  width: 100%;
  min-width: 100px;
  max-width: 160px;
  padding: 0.45rem 0.6rem;
  font-size: 0.875rem;
}
tbody td:last-child .input-compact {
  max-width: 220px;
}
.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0.5rem 0;
}
.skeleton-line {
  height: 36px;
  border-radius: var(--radius-sm);
  background: linear-gradient(90deg, var(--surface-soft) 25%, var(--border-light) 50%, var(--surface-soft) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.2s ease-in-out infinite;
}
</style>
