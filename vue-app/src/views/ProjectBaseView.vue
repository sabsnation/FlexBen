<template>
  <div class="container">
    <PageHeader
      title="Base funcional do projeto"
      :subtitle="scope.positioning"
      eyebrow="Governança"
    >
      <template #meta>
        <p class="muted text-xs mt-2">
          Versão <strong>{{ scope.version }}</strong> · Atores: {{ scope.actors.join(', ') }}
        </p>
      </template>
    </PageHeader>

    <div class="grid cols-2 mb-3">
      <div class="card">
        <h3 class="card-title">
          <span class="title-with-icon">
            <span class="icon-bg sm"><Icon name="check-circle" :size="14" /></span>
            Requisitos funcionais
          </span>
        </h3>
        <div class="table-wrapper" style="border: none; box-shadow: none;">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Funcionalidade</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="rf in functional" :key="rf.id">
                <td><strong>{{ rf.id }}</strong></td>
                <td>{{ rf.title }}</td>
                <td><span class="badge badge-success">{{ rf.status }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <h3 class="card-title">
          <span class="title-with-icon">
            <span class="icon-bg sm info"><Icon name="target" :size="14" /></span>
            Requisitos não funcionais
          </span>
        </h3>
        <div class="table-wrapper" style="border: none; box-shadow: none;">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Objetivo</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="rnf in nonFunctional" :key="rnf.id">
                <td><strong>{{ rnf.id }}</strong></td>
                <td>{{ rnf.title }}</td>
                <td><span class="badge badge-success">{{ rnf.status }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="grid cols-2 mb-3">
      <div class="card">
        <h3 class="card-title">
          <span class="title-with-icon">
            <span class="icon-bg sm"><Icon name="layers" :size="14" /></span>
            Módulos da solução
          </span>
        </h3>
        <ul class="feature-list">
          <li v-for="mod in modules" :key="mod.id">
            <strong>{{ mod.id }} — {{ mod.name }}</strong>
            <small class="muted">Owner: {{ mod.owner }}</small>
          </li>
        </ul>
      </div>
      <div class="card">
        <h3 class="card-title">
          <span class="title-with-icon">
            <span class="icon-bg sm warning"><Icon name="x-circle" :size="14" /></span>
            Fora de escopo
          </span>
        </h3>
        <ul class="feature-list">
          <li v-for="item in scope.outOfScope" :key="item">
            <span>{{ item }}</span>
          </li>
        </ul>
      </div>
    </div>

    <div class="grid cols-2">
      <div class="card">
        <h3 class="card-title">
          <span class="title-with-icon">
            <span class="icon-bg sm info"><Icon name="activity" :size="14" /></span>
            Estados do processo
          </span>
        </h3>
        <div class="state-row">
          <template v-for="(state, i) in scope.processStates" :key="state">
            <span class="state-pill" :class="stateClass(state)">
              {{ state.replace('_', ' ') }}
            </span>
            <Icon
              v-if="i < scope.processStates.length - 1"
              name="arrow-right"
              :size="14"
              class="state-arrow"
            />
          </template>
        </div>
      </div>
      <div class="card">
        <h3 class="card-title">
          <span class="title-with-icon">
            <span class="icon-bg sm"><Icon name="shield" :size="14" /></span>
            Capacidades por perfil
          </span>
        </h3>
        <div v-for="(caps, roleName) in capabilities" :key="roleName" class="role-block">
          <span class="badge" :class="rolePill(roleName)">{{ roleLabel(roleName) }}</span>
          <ul>
            <li v-for="cap in caps" :key="cap">{{ cap }}</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  PROJECT_SCOPE as scope,
  FUNCTIONAL_REQUIREMENTS as functional,
  NON_FUNCTIONAL_REQUIREMENTS as nonFunctional,
  SYSTEM_MODULES as modules,
  ROLE_CAPABILITIES as capabilities
} from '../config/projectScope'
import PageHeader from '../components/PageHeader.vue'
import Icon from '../components/Icon.vue'

const stateClass = (state) => {
  if (state === 'aprovado' || state === 'liquidado') return 'success'
  if (state === 'reprovado') return 'danger'
  if (state === 'em_analise' || state === 'solicitado') return 'warning'
  return ''
}

const roleLabel = (role) => {
  if (role === 'administrador') return 'RH / Admin'
  if (role === 'gestor') return 'Gestor'
  if (role === 'financeiro') return 'Financeiro'
  return 'Colaborador'
}
const rolePill = (role) => {
  if (role === 'administrador') return 'badge-primary'
  if (role === 'gestor') return 'badge-info'
  if (role === 'financeiro') return 'badge-warning'
  return 'badge-success'
}
</script>

<style scoped>
.title-with-icon { display: inline-flex; align-items: center; gap: 10px; }
.feature-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.feature-list li {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 0.7rem 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: var(--surface-soft);
  transition: var(--transition);
}
.feature-list li:hover { border-color: var(--border-light); background: var(--surface); }
.feature-list small { font-size: 0.72rem; }

.state-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.state-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0.45rem 0.9rem;
  background: var(--surface-soft);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: capitalize;
}
.state-pill.success { background: var(--brand-accent-soft); color: #166534; border-color: #bbf7d0; }
.state-pill.warning { background: var(--brand-warn-soft); color: #854d0e; border-color: #fde68a; }
.state-pill.danger  { background: var(--brand-danger-soft); color: #991b1b; border-color: #fecaca; }
.state-arrow { color: var(--text-subtle); }

.role-block { margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-subtle); }
.role-block:last-child { margin-bottom: 0; padding-bottom: 0; border-bottom: none; }
.role-block ul {
  list-style: none;
  padding-left: 0;
  margin-top: 0.65rem;
  color: var(--text-muted);
  font-size: var(--text-sm);
  line-height: 1.6;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.role-block ul li {
  padding-left: 1.1rem;
  position: relative;
}
.role-block ul li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.55em;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--brand-primary);
}
</style>
