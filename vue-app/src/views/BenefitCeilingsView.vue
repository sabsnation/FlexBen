<template>
  <div class="container">
    <PageHeader
      title="Tetos de benefícios"
      subtitle="Defina tetos padrão para colaboradores. Criação e aumentos exigem aprovação de gestor ou RH/Admin."
      eyebrow="Financeiro"
    >
      <template #actions>
        <button class="btn btn-ghost" type="button" @click="refresh">
          <Icon name="refresh" :size="14" /> Atualizar
        </button>
      </template>
    </PageHeader>

    <div class="notice info mb-3">
      <Icon class="notice-icon" name="info" :size="18" />
      <span>
        <strong>Criar</strong> categoria/teto e <strong>aumentar</strong> valores passam por aprovação superior.
        Reduções podem ser aplicadas imediatamente por gestor ou administrador.
      </span>
    </div>

    <div class="grid cols-2 mb-3">
      <div class="card">
        <h3 class="card-title">Nova solicitação</h3>
        <form class="form-stack" @submit.prevent="submitProposal">
          <div class="form-group">
            <label>Tipo</label>
            <select v-model="form.requestType" @change="onTypeChange">
              <option value="create">Criar novo teto (categoria)</option>
              <option value="increase">Aumentar teto existente</option>
              <option value="decrease">Reduzir teto existente</option>
            </select>
          </div>

          <div v-if="form.requestType === 'create'" class="form-group">
            <label>Nome da categoria</label>
            <input v-model="form.categoryName" type="text" placeholder="Ex.: Bem-estar" required />
          </div>

          <div v-else class="form-group">
            <label>Categoria</label>
            <select v-model="form.categoryId" required @change="syncCategoryName">
              <option value="">— Selecione —</option>
              <option v-for="c in activeCategories" :key="c.id" :value="c.id">
                {{ c.nome }} (atual: {{ formatCurrency(c.limite) }})
              </option>
            </select>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Teto mensal proposto (R$)</label>
              <input v-model.number="form.proposedMonthlyCap" type="number" min="1" step="0.01" required />
            </div>
            <div class="form-group">
              <label>Máx. por transação (R$)</label>
              <input
                v-model.number="form.proposedMaxPerTx"
                type="number"
                min="0"
                step="0.01"
                placeholder="Opcional"
              />
            </div>
          </div>

          <div class="form-group">
            <label>Justificativa</label>
            <textarea
              v-model="form.justification"
              rows="3"
              placeholder="Motivo da alteração para análise do gestor"
              required
            />
          </div>

          <button class="btn btn-primary" type="submit" :disabled="submitting || !auth.can('ceiling_propose')">
            <Icon v-if="submitting" name="spinner" :size="14" class="spin" />
            <Icon v-else name="send" :size="14" />
            Enviar para aprovação
          </button>
        </form>
      </div>

      <div class="card">
        <h3 class="card-title">Tetos vigentes</h3>
        <EmptyState
          v-if="!activeCategories.length"
          icon="layers"
          title="Sem categorias"
          message="Crie a primeira categoria por solicitação de novo teto."
        />
        <div v-else class="table-wrapper" style="border: none; box-shadow: none;">
          <table>
            <thead>
              <tr>
                <th>Categoria</th>
                <th>Teto mensal</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in activeCategories" :key="c.id">
                <td><strong>{{ c.nome }}</strong></td>
                <td>{{ formatCurrency(c.limite) }}</td>
                <td><span class="badge badge-success">{{ c.status }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="card">
      <h3 class="card-title">Histórico de solicitações</h3>
      <EmptyState
        v-if="!proposals.length"
        icon="inbox"
        title="Nenhuma solicitação"
        message="Envie uma proposta de teto acima."
      />
      <div v-else class="table-wrapper" style="border: none; box-shadow: none;">
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Categoria</th>
              <th>Atual</th>
              <th>Proposto</th>
              <th>Status</th>
              <th>Solicitante</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in proposals" :key="p.id">
              <td>{{ typeLabel(p.requestType) }}</td>
              <td><strong>{{ p.categoryName }}</strong></td>
              <td>{{ p.currentMonthlyCap != null ? formatCurrency(p.currentMonthlyCap) : '—' }}</td>
              <td><strong>{{ formatCurrency(p.proposedMonthlyCap) }}</strong></td>
              <td><StatusBadge :status="p.status" /></td>
              <td class="muted text-sm">{{ p.requesterEmail }}</td>
              <td class="muted">{{ p.createdAt }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted } from 'vue'
import { useToast } from '../toast'
import { useAuth } from '../auth'
import { useCategories } from '../categories'
import { useCeilings } from '../ceilings'
import PageHeader from '../components/PageHeader.vue'
import EmptyState from '../components/EmptyState.vue'
import StatusBadge from '../components/StatusBadge.vue'
import Icon from '../components/Icon.vue'

const { showToast } = useToast()
const auth = useAuth()
const { categories, loadCategories } = useCategories()
const { proposals, loadProposals, createProposal } = useCeilings()

const submitting = ref(false)
const form = reactive({
  requestType: 'increase',
  categoryId: '',
  categoryName: '',
  proposedMonthlyCap: null,
  proposedMaxPerTx: null,
  justification: ''
})

const activeCategories = computed(() => categories.value.filter((c) => c.status !== 'Inativa'))

const formatCurrency = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const typeLabel = (t) => {
  const map = { create: 'Criar', increase: 'Aumento', decrease: 'Redução' }
  return map[t] || t
}

const onTypeChange = () => {
  form.categoryId = ''
  form.categoryName = ''
}

const syncCategoryName = () => {
  const cat = activeCategories.value.find((c) => String(c.id) === String(form.categoryId))
  form.categoryName = cat?.nome || ''
}

const refresh = async () => {
  await Promise.allSettled([loadCategories(), loadProposals()])
}

onMounted(refresh)

const submitProposal = async () => {
  if (!auth.can('ceiling_propose')) {
    showToast('Sem permissão para propor tetos.', 'error')
    return
  }
  submitting.value = true
  try {
    const payload = {
      requestType: form.requestType,
      categoryName: form.requestType === 'create' ? form.categoryName.trim() : form.categoryName,
      categoryId: form.categoryId ? Number(form.categoryId) : undefined,
      proposedMonthlyCap: Number(form.proposedMonthlyCap),
      proposedMaxPerTx: form.proposedMaxPerTx ? Number(form.proposedMaxPerTx) : undefined,
      justification: form.justification.trim()
    }
    const created = await createProposal(payload)
    const msg =
      created.status === 'Concluída'
        ? 'Teto aplicado com sucesso.'
        : 'Solicitação enviada para aprovação do gestor.'
    showToast(msg)
    form.justification = ''
    form.proposedMonthlyCap = null
    form.proposedMaxPerTx = null
    await loadProposals()
  } catch (e) {
    showToast(e.message || 'Falha ao enviar solicitação.', 'error')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.form-stack {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
</style>
