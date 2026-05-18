<template>
  <div class="container">
    <PageHeader
      title="Base funcional do projeto"
      :subtitle="scope.positioning"
    >
      <template #meta>
        <p class="muted" style="font-size: 0.82rem; margin-top: 0.5rem;">
          Versão <strong>{{ scope.version }}</strong> · Atores: {{ scope.actors.join(', ') }}
        </p>
      </template>
    </PageHeader>

    <div class="grid cols-2 mb-3">
      <div class="card">
        <h3 class="card-title">Requisitos funcionais</h3>
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
        <h3 class="card-title">Requisitos não funcionais</h3>
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
        <h3 class="card-title">Módulos da solução</h3>
        <ul class="feature-list">
          <li v-for="mod in modules" :key="mod.id">
            <strong>{{ mod.id }} — {{ mod.name }}</strong>
            <small class="muted">Owner: {{ mod.owner }}</small>
          </li>
        </ul>
      </div>
      <div class="card">
        <h3 class="card-title">Fora de escopo (atual)</h3>
        <ul class="feature-list">
          <li v-for="item in scope.outOfScope" :key="item">
            <span>{{ item }}</span>
          </li>
        </ul>
      </div>
    </div>

    <div class="grid cols-2">
      <div class="card">
        <h3 class="card-title">Estados do processo</h3>
        <div class="state-row">
          <span v-for="(state, i) in scope.processStates" :key="state" class="state-pill" :class="stateClass(state)">
            {{ state.replace('_', ' ') }}
            <span v-if="i < scope.processStates.length - 1" class="state-arrow">→</span>
          </span>
        </div>
      </div>
      <div class="card">
        <h3 class="card-title">Capacidades por perfil</h3>
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
.feature-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.feature-list li {
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  padding: 0.6rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: var(--surface-soft);
}
.feature-list small { font-size: 0.75rem; }

.state-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.state-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0.4rem 0.85rem;
  background: var(--surface-soft);
  border: 1px solid var(--border-light);
  border-radius: 100px;
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: capitalize;
}
.state-pill.success { background: #dcfce7; color: #166534; border-color: #bbf7d0; }
.state-pill.warning { background: #fef9c3; color: #854d0e; border-color: #fde68a; }
.state-pill.danger  { background: #fee2e2; color: #991b1b; border-color: #fecaca; }
.state-arrow { color: var(--text-muted); font-weight: 800; }

.role-block { margin-bottom: 1rem; }
.role-block:last-child { margin-bottom: 0; }
.role-block ul {
  list-style: disc;
  padding-left: 1.25rem;
  margin-top: 0.5rem;
  color: var(--text-muted);
  font-size: 0.85rem;
  line-height: 1.6;
}
</style>
