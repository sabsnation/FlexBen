<template>
  <div class="container">
    <PageHeader
      title="Fila de aprovações"
      subtitle="Utilização de benefícios e alterações de tetos aguardam decisão de gestor ou RH/Admin."
      eyebrow="Gestão"
    >
      <template #actions>
        <button class="btn btn-secondary" type="button" @click="refresh(true)">
          <Icon name="refresh" :size="14" /> Atualizar
        </button>
      </template>
    </PageHeader>

    <div class="tabs mb-3">
      <button
        type="button"
        class="tab-btn"
        :class="{ active: activeTab === 'usage' }"
        @click="activeTab = 'usage'"
      >
        Utilização de créditos
      </button>
      <button
        type="button"
        class="tab-btn"
        :class="{ active: activeTab === 'ceilings' }"
        @click="switchCeilingsTab"
      >
        Tetos de benefícios
        <span v-if="pendingCeilingsCount" class="tab-badge">{{ pendingCeilingsCount }}</span>
      </button>
    </div>

    <div v-show="activeTab === 'usage'" class="grid cols-4 mb-3">
      <KpiCard label="Em análise" :value="sla.kpis.inAnalysis" tone="warning" icon="clock" />
      <KpiCard label="Aprovadas" :value="sla.kpis.approved" tone="success" icon="check-circle" />
      <KpiCard label="Reprovadas" :value="sla.kpis.rejected" tone="danger" icon="x-circle" />
      <KpiCard
        label="SLA médio"
        :value="`${sla.kpis.avgApprovalHours.toFixed(1)}h`"
        tone="info"
        icon="activity"
        hint="Tempo médio até decisão"
      />
    </div>

    <div v-show="activeTab === 'usage'" class="card mb-3">
      <h3 class="card-title">
        <span class="title-with-icon">
          <span class="icon-bg sm"><Icon name="filter" :size="14" /></span>
          Filtros
        </span>
      </h3>
      <div class="form-row">
        <div class="form-group">
          <label>Status</label>
          <select v-model="statusFilter" @change="loadApprovals">
            <option value="">Todos</option>
            <option value="em_analise">Em análise</option>
            <option value="aprovado">Aprovado</option>
            <option value="reprovado">Reprovado</option>
            <option value="liquidado">Liquidado</option>
          </select>
        </div>
        <div class="form-group">
          <label>SLA crítico (dias)</label>
          <input v-model.number="thresholdDays" type="number" min="1" @change="loadSlaSummary" />
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'usage' && sla.staleApprovals.length" class="card mb-3 card-stale">
      <h3 class="card-title">
        <span class="title-with-icon">
          <span class="icon-bg sm danger"><Icon name="alert-triangle" :size="14" /></span>
          Pendências antigas ({{ sla.staleApprovals.length }})
        </span>
        <span class="muted text-xs">{{ thresholdDays }}+ dias sem decisão</span>
      </h3>
      <div class="table-wrapper" style="border: none; box-shadow: none;">
        <table>
          <thead>
            <tr>
              <th>Solicitante</th>
              <th>Categoria</th>
              <th>Valor</th>
              <th>Status</th>
              <th>Idade</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in sla.staleApprovals" :key="'stale-' + item.id">
              <td>{{ item.requesterName }}</td>
              <td>{{ item.category }}</td>
              <td><strong>{{ formatCurrency(item.amount) }}</strong></td>
              <td><StatusBadge :status="item.status" /></td>
              <td><strong class="text-danger">{{ item.ageDays }} dia(s)</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-show="activeTab === 'usage'" class="card">
      <h3 class="card-title">
        <span class="title-with-icon">
          <span class="icon-bg sm"><Icon name="inbox" :size="14" /></span>
          Utilização — solicitações
        </span>
      </h3>

      <EmptyState v-if="!approvals.length" icon="check-circle" title="Nenhuma solicitação" message="Sem itens para os filtros aplicados." />

      <div v-else class="table-wrapper" style="border: none; box-shadow: none;">
        <table>
          <thead>
            <tr>
              <th>Solicitante</th>
              <th>Categoria</th>
              <th>Valor</th>
              <th>Status</th>
              <th>Descrição</th>
              <th>Solicitado</th>
              <th style="text-align: right;">Decisão</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in approvals" :key="'usage-' + item.id">
              <td><strong>{{ item.requesterName }}</strong></td>
              <td>{{ item.category }}</td>
              <td><strong>{{ formatCurrency(item.amount) }}</strong></td>
              <td><StatusBadge :status="item.status" /></td>
              <td class="muted truncate" style="max-width: 240px;">{{ item.description || '—' }}</td>
              <td class="muted">{{ item.requestedAt }}</td>
              <td class="text-right">
                <div class="actions" style="justify-content: flex-end; gap: 4px;">
                  <button
                    class="btn btn-success btn-sm"
                    type="button"
                    @click="openDecision(item, 'aprovado')"
                    :disabled="!isPending(item.status) || !auth.can('approval_decide')"
                  >
                    <Icon name="check" :size="12" /> Aprovar
                  </button>
                  <button
                    class="btn btn-danger btn-sm"
                    type="button"
                    @click="openDecision(item, 'reprovado')"
                    :disabled="!isPending(item.status) || !auth.can('approval_decide')"
                  >
                    <Icon name="x" :size="12" /> Reprovar
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-show="activeTab === 'ceilings'" class="card">
      <h3 class="card-title">
        <span class="title-with-icon">
          <span class="icon-bg sm warning"><Icon name="target" :size="14" /></span>
          Tetos — aguardando aprovação
        </span>
      </h3>

      <EmptyState
        v-if="!ceilingApprovals.length"
        icon="check-circle"
        title="Nenhum teto pendente"
        message="Criações e aumentos de teto aparecem aqui para decisão."
      />

      <div v-else class="table-wrapper" style="border: none; box-shadow: none;">
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Categoria</th>
              <th>Atual</th>
              <th>Proposto</th>
              <th>Solicitante</th>
              <th>Status</th>
              <th style="text-align: right;">Decisão</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in ceilingApprovals" :key="'ceil-' + item.id">
              <td>{{ ceilingTypeLabel(item.requestType) }}</td>
              <td><strong>{{ item.categoryName }}</strong></td>
              <td>{{ item.currentMonthlyCap != null ? formatCurrency(item.currentMonthlyCap) : '—' }}</td>
              <td><strong>{{ formatCurrency(item.proposedMonthlyCap) }}</strong></td>
              <td class="muted text-sm">{{ item.requesterEmail }}</td>
              <td><StatusBadge :status="item.status" /></td>
              <td class="text-right">
                <div class="actions" style="justify-content: flex-end; gap: 4px;">
                  <button
                    class="btn btn-success btn-sm"
                    type="button"
                    :disabled="!isPending(item.status) || !auth.can('ceiling_approve')"
                    @click="openCeilingDecision(item, 'aprovado')"
                  >
                    <Icon name="check" :size="12" /> Aprovar
                  </button>
                  <button
                    class="btn btn-danger btn-sm"
                    type="button"
                    :disabled="!isPending(item.status) || !auth.can('ceiling_approve')"
                    @click="openCeilingDecision(item, 'reprovado')"
                  >
                    <Icon name="x" :size="12" /> Reprovar
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Modal :open="modal.open" :title="modal.title" @close="closeDecision">
      <div v-if="modal.item">
        <div class="info-grid mb-2">
          <template v-if="modal.kind === 'usage'">
            <div><span class="muted">Solicitante</span><strong>{{ modal.item.requesterName }}</strong></div>
            <div><span class="muted">Categoria</span><strong>{{ modal.item.category }}</strong></div>
            <div><span class="muted">Valor</span><strong>{{ formatCurrency(modal.item.amount) }}</strong></div>
            <div><span class="muted">Solicitado em</span><strong>{{ modal.item.requestedAt }}</strong></div>
          </template>
          <template v-else>
            <div><span class="muted">Tipo</span><strong>{{ ceilingTypeLabel(modal.item.requestType) }}</strong></div>
            <div><span class="muted">Categoria</span><strong>{{ modal.item.categoryName }}</strong></div>
            <div>
              <span class="muted">Teto proposto</span>
              <strong>{{ formatCurrency(modal.item.proposedMonthlyCap) }}</strong>
            </div>
            <div><span class="muted">Solicitante</span><strong>{{ modal.item.requesterEmail }}</strong></div>
          </template>
        </div>
        <div class="form-group">
          <label>Justificativa <span class="req">*</span></label>
          <textarea v-model="modal.justification" rows="3" placeholder="Descreva o motivo da decisão" />
          <p class="field-help">A justificativa fica registrada na trilha de auditoria.</p>
        </div>
        <p v-if="modal.error" class="field-error">
          <Icon name="alert-circle" :size="14" />
          {{ modal.error }}
        </p>
      </div>

      <template #footer>
        <button class="btn btn-secondary" type="button" @click="closeDecision">Cancelar</button>
        <button
          class="btn"
          :class="modal.decision === 'aprovado' ? 'btn-success' : 'btn-danger'"
          type="button"
          :disabled="modal.loading"
          @click="confirmDecision"
        >
          <Icon v-if="modal.loading" name="spinner" :size="14" class="spin" />
          <Icon v-else :name="modal.decision === 'aprovado' ? 'check' : 'x'" :size="14" />
          <span v-if="!modal.loading">{{ modal.decision === 'aprovado' ? 'Confirmar aprovação' : 'Confirmar reprovação' }}</span>
          <span v-else>Processando…</span>
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { onMounted, ref, reactive, computed } from 'vue'
import { api } from '../api'
import { useToast } from '../toast'
import { useAuth } from '../auth'
import { useCeilings } from '../ceilings'
import PageHeader from '../components/PageHeader.vue'
import KpiCard from '../components/KpiCard.vue'
import StatusBadge from '../components/StatusBadge.vue'
import EmptyState from '../components/EmptyState.vue'
import Modal from '../components/Modal.vue'
import Icon from '../components/Icon.vue'

const formatCurrency = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const activeTab = ref('usage')
const approvals = ref([])
const ceilingApprovals = ref([])
const statusFilter = ref('')
const thresholdDays = ref(7)
const sla = ref({
  kpis: { inAnalysis: 0, approved: 0, rejected: 0, avgApprovalHours: 0 },
  staleApprovals: []
})

const modal = reactive({
  open: false,
  kind: 'usage',
  item: null,
  decision: '',
  title: '',
  justification: '',
  loading: false,
  error: ''
})

const { showToast } = useToast()
const auth = useAuth()
const { loadProposals, decideProposal } = useCeilings()

const normalizeStatus = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replaceAll(' ', '_')

const isPending = (status) => {
  const s = normalizeStatus(status)
  return s === 'em_analise' || s === 'pendente'
}

const ceilingTypeLabel = (t) => {
  const map = { create: 'Criar teto', increase: 'Aumento', decrease: 'Redução' }
  return map[t] || t
}

const pendingCeilingsCount = computed(() =>
  ceilingApprovals.value.filter((p) => isPending(p.status)).length
)

const loadApprovals = async () => {
  const qs = statusFilter.value ? `?status=${statusFilter.value}` : ''
  const { approvals: rows } = await api.get(`/manager/approvals${qs}`)
  approvals.value = rows
}

const loadCeilingApprovals = async () => {
  try {
    const rows = await loadProposals({ pendingApproval: true })
    ceilingApprovals.value = rows
  } catch (err) {
    showToast(err.message, 'error')
  }
}

const switchCeilingsTab = () => {
  activeTab.value = 'ceilings'
  loadCeilingApprovals()
}

const loadSlaSummary = async () => {
  try {
    const data = await api.get(`/manager/sla-summary?thresholdDays=${thresholdDays.value}`)
    sla.value = data
  } catch (err) {
    showToast(err.message, 'error')
  }
}

const refresh = async (fromButton = false) => {
  await Promise.allSettled([loadApprovals(), loadSlaSummary(), loadCeilingApprovals()])
  if (fromButton) showToast('Fila de aprovações atualizada.')
}

const openDecision = (item, decision) => {
  modal.kind = 'usage'
  modal.item = item
  modal.decision = decision
  modal.title = decision === 'aprovado' ? 'Aprovar solicitação' : 'Reprovar solicitação'
  modal.justification = ''
  modal.error = ''
  modal.open = true
}

const openCeilingDecision = (item, decision) => {
  modal.kind = 'ceilings'
  modal.item = item
  modal.decision = decision
  modal.title =
    decision === 'aprovado' ? 'Aprovar alteração de teto' : 'Reprovar alteração de teto'
  modal.justification = ''
  modal.error = ''
  modal.open = true
}

const closeDecision = () => {
  modal.open = false
  modal.kind = 'usage'
  modal.item = null
  modal.decision = ''
  modal.justification = ''
  modal.error = ''
  modal.loading = false
}

const confirmDecision = async () => {
  modal.error = ''
  const just = modal.justification.trim()
  if (!just) {
    modal.error = 'Informe a justificativa.'
    return
  }
  modal.loading = true
  try {
    if (modal.kind === 'ceilings') {
      await decideProposal(modal.item.id, {
        decision: modal.decision,
        justification: just
      })
      showToast(`Teto ${modal.decision === 'aprovado' ? 'aprovado e aplicado' : 'reprovado'}.`, 'success')
    } else {
      await api.post(`/manager/approvals/${modal.item.id}/decision`, {
        decision: modal.decision,
        justification: just
      })
      showToast(`Solicitação ${modal.decision}.`, 'success')
    }
    closeDecision()
    await refresh()
  } catch (err) {
    modal.error = err.message
    showToast(err.message, 'error')
  } finally {
    modal.loading = false
  }
}

onMounted(refresh)
</script>

<style scoped>
.title-with-icon { display: inline-flex; align-items: center; gap: 10px; }
.card-stale { border-left: 4px solid var(--brand-danger); }
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.75rem 1rem;
  background: var(--surface-soft);
  padding: 1rem 1.1rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
}
.info-grid > div { display: flex; flex-direction: column; gap: 4px; }
.info-grid .muted { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }
.info-grid strong { color: var(--text-strong); font-size: 0.95rem; }

.tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.tab-btn {
  padding: 0.55rem 1rem;
  border-radius: var(--radius-full);
  border: 1px solid var(--border-light);
  background: var(--surface);
  color: var(--text-muted);
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: var(--transition);
}
.tab-btn.active {
  background: var(--brand-primary);
  border-color: var(--brand-primary);
  color: #fff;
}
.tab-badge {
  background: rgba(255, 255, 255, 0.25);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
}
</style>
