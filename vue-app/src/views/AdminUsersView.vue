<template>
  <div class="container">
    <PageHeader
      title="Gestão de usuários"
      subtitle="Administre acessos, perfis e status dos colaboradores do programa flex."
      eyebrow="Administração"
    >
      <template #actions>
        <button class="btn btn-primary" @click="openInvite">
          <Icon name="plus" :size="14" /> Convidar usuário
        </button>
      </template>
    </PageHeader>

    <div class="grid cols-4 mb-3">
      <KpiCard label="Total de usuários" :value="total" tone="info" icon="users" />
      <KpiCard label="Ativos" :value="counts.active" tone="success" icon="check-circle" />
      <KpiCard label="Inativos" :value="counts.inactive" tone="warning" icon="x-circle" />
      <KpiCard label="Administradores" :value="counts.admin" icon="shield" />
    </div>

    <div class="card mb-3">
      <h3 class="card-title">
        <span class="title-with-icon">
          <span class="icon-bg sm"><Icon name="filter" :size="14" /></span>
          Filtros
        </span>
      </h3>
      <div class="form-row">
        <div class="form-group">
          <label>Buscar</label>
          <div class="input-wrap">
            <Icon name="search" :size="14" class="input-icon" />
            <input v-model="filters.search" type="text" placeholder="Nome ou e-mail…" />
          </div>
        </div>
        <div class="form-group">
          <label>Perfil</label>
          <select v-model="filters.role">
            <option value="">Todos</option>
            <option value="colaborador">Colaborador</option>
            <option value="gestor">Gestor</option>
            <option value="administrador">RH / Admin</option>
            <option value="financeiro">Financeiro</option>
          </select>
        </div>
        <div class="form-group">
          <label>Status</label>
          <select v-model="filters.status">
            <option value="">Todos</option>
            <option value="Ativo">Ativos</option>
            <option value="Inativo">Inativos</option>
          </select>
        </div>
      </div>
    </div>

    <div v-if="filtered.length === 0" class="card">
      <EmptyState icon="users" title="Nenhum usuário encontrado" message="Ajuste os filtros ou convide um novo usuário." />
    </div>

    <div v-else class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Usuário</th>
            <th>E-mail</th>
            <th>Perfil</th>
            <th>Login</th>
            <th>Status</th>
            <th>Cadastro</th>
            <th style="text-align: right;">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in filtered" :key="u.id">
            <td>
              <div class="user-row">
                <div class="avatar sm" :style="{ background: roleColor(u.role) }">{{ u.initials || (u.nome || '?')[0] }}</div>
                <strong>{{ u.nome }}</strong>
              </div>
            </td>
            <td class="muted">{{ u.email }}</td>
            <td><span class="badge" :class="rolePill(u.role)">{{ roleLabel(u.role) }}</span></td>
            <td><span class="badge badge-muted">{{ authLabel(u.authProvider) }}</span></td>
            <td><StatusBadge :status="u.status" /></td>
            <td class="muted">{{ u.data }}</td>
            <td class="text-right">
              <div class="actions" style="justify-content: flex-end; gap: 4px;">
                <button class="btn-icon" type="button" @click="handleToggleStatus(u.id)" :title="u.status === 'Ativo' ? 'Inativar' : 'Reativar'">
                  <Icon :name="u.status === 'Ativo' ? 'check-circle' : 'x-circle'" :size="14" />
                </button>
                <button class="btn-icon danger" type="button" @click="handleDelete(u.id, u.nome)" title="Excluir">
                  <Icon name="trash" :size="14" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Modal :open="modal.open" title="Convidar novo usuário" @close="closeModal">
      <div class="form-group">
        <label>Nome completo <span class="req">*</span></label>
        <input v-model="form.nome" type="text" placeholder="Nome e sobrenome" />
      </div>
      <div class="form-group">
        <label>E-mail corporativo <span class="req">*</span></label>
        <input v-model="form.email" type="email" placeholder="nome@empresa.com" />
      </div>
      <div class="form-group">
        <label>Tipo de acesso <span class="req">*</span></label>
        <div class="auth-type-row">
          <button
            type="button"
            class="auth-type-btn"
            :class="{ active: form.authProvider === 'password' }"
            @click="form.authProvider = 'password'"
          >
            Demo / senha
          </button>
          <button
            type="button"
            class="auth-type-btn"
            :class="{ active: form.authProvider === 'google' }"
            @click="setGoogleAuth"
          >
            Google
          </button>
        </div>
        <p v-if="form.authProvider === 'google'" class="field-help">
          Use o e-mail da conta Google do colaborador. O acesso será apenas pelo botão «Entrar com Google».
        </p>
      </div>
      <div class="form-group">
        <label>Perfil de acesso <span class="req">*</span></label>
        <select v-model="form.role">
          <option value="colaborador">Colaborador</option>
          <option value="gestor">Gestor</option>
          <option value="administrador">RH / Admin</option>
          <option value="financeiro">Financeiro</option>
        </select>
      </div>
      <div v-if="form.authProvider === 'password'" class="form-group">
        <label>Senha provisória <span class="req">*</span></label>
        <input v-model="form.senha" type="text" placeholder="Mínimo 6 caracteres" />
        <p class="field-help">Compartilhe esta senha com segurança. O usuário pode trocá-la depois.</p>
      </div>
      <p v-if="modal.error" class="field-error">{{ modal.error }}</p>

      <template #footer>
        <button class="btn btn-secondary" type="button" @click="closeModal">Cancelar</button>
        <button class="btn btn-primary" type="button" @click="handleInvite" :disabled="modal.loading">
          <Icon v-if="modal.loading" name="spinner" :size="14" class="spin" />
          <span v-if="!modal.loading">Convidar</span>
          <span v-else>Enviando…</span>
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { reactive, computed, onMounted } from 'vue'
import { useUsers } from '../users'
import { useToast } from '../toast'
import { useConfirm } from '../confirm'
import PageHeader from '../components/PageHeader.vue'
import KpiCard from '../components/KpiCard.vue'
import StatusBadge from '../components/StatusBadge.vue'
import EmptyState from '../components/EmptyState.vue'
import Modal from '../components/Modal.vue'
import Icon from '../components/Icon.vue'

const { users, loadUsers, toggleStatus, deleteUser, inviteUser } = useUsers()
const { showToast } = useToast()
const { confirm } = useConfirm()

onMounted(async () => {
  try {
    await loadUsers()
  } catch (err) {
    showToast(err.message, 'error')
  }
})

const filters = reactive({ search: '', role: '', status: '' })
const form = reactive({ nome: '', email: '', role: 'colaborador', senha: '', authProvider: 'password' })
const modal = reactive({ open: false, error: '', loading: false })

const total = computed(() => users.value.length)
const counts = computed(() => {
  const list = users.value
  return {
    active: list.filter((u) => u.status === 'Ativo').length,
    inactive: list.filter((u) => u.status === 'Inativo').length,
    admin: list.filter((u) => u.role === 'administrador').length
  }
})

const filtered = computed(() => {
  const search = filters.search.trim().toLowerCase()
  return users.value.filter((u) => {
    const matchesSearch =
      !search ||
      (u.nome || '').toLowerCase().includes(search) ||
      (u.email || '').toLowerCase().includes(search)
    const matchesRole = !filters.role || u.role === filters.role
    const matchesStatus = !filters.status || u.status === filters.status
    return matchesSearch && matchesRole && matchesStatus
  })
})

const roleColor = (role) => {
  if (role === 'administrador') return 'linear-gradient(135deg, #6366f1, #4338ca)'
  if (role === 'gestor') return 'linear-gradient(135deg, #0ea5e9, #0369a1)'
  if (role === 'financeiro') return 'linear-gradient(135deg, #f59e0b, #d97706)'
  return 'linear-gradient(135deg, #10b981, #059669)'
}
const roleLabel = (role) => {
  if (role === 'administrador') return 'RH / Admin'
  if (role === 'gestor') return 'Gestor'
  if (role === 'financeiro') return 'Financeiro'
  return 'Colaborador'
}
const authLabel = (provider) => (provider === 'google' ? 'Google' : 'Senha')
const setGoogleAuth = () => {
  form.authProvider = 'google'
  form.senha = ''
}
const rolePill = (role) => {
  if (role === 'administrador') return 'badge-primary'
  if (role === 'gestor') return 'badge-info'
  if (role === 'financeiro') return 'badge-warning'
  return 'badge-success'
}

const openInvite = () => {
  form.nome = ''
  form.email = ''
  form.role = 'colaborador'
  form.senha = ''
  form.authProvider = 'password'
  modal.error = ''
  modal.open = true
}
const closeModal = () => {
  modal.open = false
  modal.loading = false
}

const handleInvite = async () => {
  modal.error = ''
  if (!form.nome.trim() || form.nome.trim().length < 2) {
    modal.error = 'Informe o nome completo.'
    return
  }
  if (!form.email.includes('@')) {
    modal.error = 'Informe um e-mail corporativo válido.'
    return
  }
  if (form.authProvider === 'password' && (!form.senha || form.senha.length < 6)) {
    modal.error = 'A senha provisória precisa ter ao menos 6 caracteres.'
    return
  }
  modal.loading = true
  try {
    await inviteUser({
      nome: form.nome.trim(),
      email: form.email.trim(),
      senha: form.authProvider === 'password' ? form.senha : undefined,
      authProvider: form.authProvider,
      role: form.role
    })
    showToast('Usuário convidado com sucesso.')
    closeModal()
  } catch (err) {
    modal.error = err.message
    showToast(err.message, 'error')
  } finally {
    modal.loading = false
  }
}

const handleToggleStatus = async (id) => {
  try {
    await toggleStatus(id)
    showToast('Status atualizado.', 'success')
  } catch (err) {
    showToast(err.message, 'error')
  }
}

const handleDelete = async (id, nome) => {
  const ok = await confirm({
    title: 'Excluir usuário',
    message: `Remover ${nome} do sistema?`,
    detail: 'Esta ação é irreversível e não pode ser desfeita.',
    confirmLabel: 'Excluir',
    cancelLabel: 'Manter',
    variant: 'danger'
  })
  if (!ok) return
  try {
    await deleteUser(id)
    showToast('Usuário removido.', 'success')
  } catch (err) {
    showToast(err.message, 'error')
  }
}
</script>

<style scoped>
.user-row { display: flex; align-items: center; gap: 12px; }
.title-with-icon { display: inline-flex; align-items: center; gap: 10px; }
.input-wrap { position: relative; }
.input-wrap input { padding-left: 2.25rem; }
.input-icon {
  position: absolute;
  top: 50%;
  left: 10px;
  transform: translateY(-50%);
  color: var(--text-subtle);
  pointer-events: none;
}
.auth-type-row {
  display: flex;
  gap: 8px;
}
.auth-type-btn {
  flex: 1;
  padding: 0.55rem 0.75rem;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  background: var(--surface);
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  transition: var(--transition);
}
.auth-type-btn:hover {
  border-color: var(--brand-primary);
  color: var(--text-strong);
}
.auth-type-btn.active {
  border-color: var(--brand-primary);
  background: var(--brand-primary-softer);
  color: var(--brand-primary-dark);
}
</style>
