<template>
  <div class="container">
    <PageHeader
      title="Categorias e limites"
      subtitle="Configure os tipos de benefícios flex e os tetos mensais aplicados na carga e nas operações."
      eyebrow="Administração"
    >
      <template #actions>
        <button class="btn btn-primary" @click="openCreate">
          <Icon name="plus" :size="14" /> Nova categoria
        </button>
      </template>
    </PageHeader>

    <div class="grid cols-3 mb-3">
      <KpiCard label="Categorias ativas" :value="activeCount" tone="success" icon="check-circle" />
      <KpiCard label="Categorias inativas" :value="inactiveCount" tone="warning" icon="x-circle" />
      <KpiCard
        label="Limite total mensal"
        :value="limitTotal"
        format="currency"
        tone="info"
        icon="dollar-sign"
        :hint="`Por colaborador ativo`"
      />
    </div>

    <div v-if="categories.length === 0" class="card">
      <EmptyState icon="layers" title="Sem categorias cadastradas" message="Adicione a primeira categoria para começar a operar.">
        <button class="btn btn-primary" @click="openCreate">
          <Icon name="plus" :size="14" /> Nova categoria
        </button>
      </EmptyState>
    </div>

    <div v-else class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Categoria</th>
            <th>Limite mensal</th>
            <th>Status</th>
            <th style="text-align: right;">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in categories" :key="c.id">
            <td class="muted">#{{ String(c.id).slice(-4) }}</td>
            <td><strong>{{ c.nome }}</strong></td>
            <td><strong>{{ formatCurrency(c.limite) }}</strong></td>
            <td><StatusBadge :status="c.status" /></td>
            <td class="text-right">
              <button class="btn-icon danger" type="button" @click="handleDelete(c.id, c.nome)" title="Excluir">
                <Icon name="trash" :size="14" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Modal :open="modal.open" title="Nova categoria de benefício" @close="closeModal">
      <div class="form-group">
        <label>Nome da categoria <span class="req">*</span></label>
        <input v-model="form.nome" type="text" placeholder="Ex.: Home Office" />
      </div>
      <div class="form-group">
        <label>Limite mensal por colaborador (R$) <span class="req">*</span></label>
        <input v-model.number="form.limite" type="number" min="0.01" step="0.01" placeholder="0,00" />
        <p class="field-help">Valor é aplicado para cada colaborador na carga mensal.</p>
      </div>
      <p v-if="modal.error" class="field-error">{{ modal.error }}</p>

      <template #footer>
        <button class="btn btn-secondary" type="button" @click="closeModal">Cancelar</button>
        <button class="btn btn-primary" type="button" :disabled="modal.loading" @click="handleSave">
          <Icon v-if="modal.loading" name="spinner" :size="14" class="spin" />
          <span v-if="!modal.loading">Adicionar categoria</span>
          <span v-else>Salvando…</span>
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { reactive, computed, onMounted } from 'vue'
import { useCategories } from '../categories'
import { useToast } from '../toast'
import { assertCategoryForm } from '../services/formValidators'
import PageHeader from '../components/PageHeader.vue'
import KpiCard from '../components/KpiCard.vue'
import StatusBadge from '../components/StatusBadge.vue'
import EmptyState from '../components/EmptyState.vue'
import Modal from '../components/Modal.vue'
import Icon from '../components/Icon.vue'

const formatCurrency = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const { categories, addCategory, deleteCategory, loadCategories } = useCategories()
const { showToast } = useToast()

onMounted(async () => {
  await loadCategories()
})

const form = reactive({ nome: '', limite: null })
const modal = reactive({ open: false, error: '', loading: false })

const activeCount = computed(() => categories.value.filter((c) => c.status !== 'Inativa').length)
const inactiveCount = computed(() => categories.value.filter((c) => c.status === 'Inativa').length)
const limitTotal = computed(() =>
  categories.value
    .filter((c) => c.status !== 'Inativa')
    .reduce((sum, c) => sum + Number(c.limite), 0)
)

const openCreate = () => {
  form.nome = ''
  form.limite = null
  modal.error = ''
  modal.open = true
}
const closeModal = () => {
  modal.open = false
  modal.loading = false
}

const handleSave = async () => {
  modal.error = ''
  const nome = form.nome?.trim()
  const limite = Number(form.limite)
  try {
    assertCategoryForm({ nome, limite })
  } catch (err) {
    modal.error = err.message
    return
  }
  modal.loading = true
  try {
    await addCategory({ nome, limite })
    showToast('Categoria adicionada com sucesso.')
    closeModal()
  } catch (err) {
    modal.error = err.message
    showToast(err.message, 'error')
  } finally {
    modal.loading = false
  }
}

const handleDelete = async (id, nome) => {
  if (!confirm(`Excluir a categoria "${nome}"?`)) return
  try {
    await deleteCategory(id)
    showToast('Categoria removida.', 'success')
  } catch (err) {
    showToast(err.message, 'error')
  }
}
</script>
