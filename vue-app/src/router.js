import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from './auth'
import { useToast } from './toast'
import LoginView from './views/LoginView.vue'
import CadastroView from './views/CadastroView.vue'
import DashboardView from './views/DashboardView.vue'
import RealocacaoView from './views/RealocacaoView.vue'
import UtilizacaoView from './views/UtilizacaoView.vue'
import TransacoesView from './views/TransacoesView.vue'
import CategoriasView from './views/CategoriasView.vue'
import CategoriasConsultaView from './views/CategoriasConsultaView.vue'
import RecuperarSenhaView from './views/RecuperarSenhaView.vue'
import AdminUsersView from './views/AdminUsersView.vue'
import AdminLoadView from './views/AdminLoadView.vue'
import AdminAuditView from './views/AdminAuditView.vue'
import ProjectBaseView from './views/ProjectBaseView.vue'
import ManagerApprovalsView from './views/ManagerApprovalsView.vue'
import RhPolicyBudgetView from './views/RhPolicyBudgetView.vue'
import FinanceClosingView from './views/FinanceClosingView.vue'

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', name: 'Login', component: LoginView },
  { path: '/cadastro', name: 'Cadastro', component: CadastroView },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: DashboardView,
    meta: { requiresAuth: true, allowedRoles: ['colaborador', 'gestor', 'administrador', 'financeiro'] }
  },
  { path: '/transferencia', redirect: '/realocar' },
  {
    path: '/realocar',
    name: 'Realocar créditos',
    component: RealocacaoView,
    meta: { requiresAuth: true, allowedRoles: ['colaborador', 'gestor', 'administrador', 'financeiro'] }
  },
  {
    path: '/utilizacao',
    name: 'Registrar utilização',
    component: UtilizacaoView,
    meta: { requiresAuth: true, allowedRoles: ['colaborador', 'gestor', 'administrador', 'financeiro'] }
  },
  {
    path: '/transacoes',
    name: 'Histórico',
    component: TransacoesView,
    meta: { requiresAuth: true, allowedRoles: ['colaborador', 'gestor', 'administrador', 'financeiro'] }
  },
  {
    path: '/consulta-categorias',
    name: 'Categorias de benefícios',
    component: CategoriasConsultaView,
    meta: { requiresAuth: true, allowedRoles: ['colaborador', 'gestor', 'administrador', 'financeiro'] }
  },
  {
    path: '/gestor/aprovacoes',
    name: 'Aprovações do Gestor',
    component: ManagerApprovalsView,
    meta: { requiresAuth: true, allowedRoles: ['gestor', 'administrador'] }
  },
  {
    path: '/rh/politicas',
    name: 'Políticas e Orçamento',
    component: RhPolicyBudgetView,
    meta: { requiresAuth: true, allowedRoles: ['administrador'] }
  },
  {
    path: '/financeiro/fechamento',
    name: 'Fechamento Mensal',
    component: FinanceClosingView,
    meta: { requiresAuth: true, allowedRoles: ['financeiro', 'administrador'] }
  },
  {
    path: '/categorias',
    name: 'Gestão de Categorias',
    component: CategoriasView,
    meta: { requiresAuth: true, allowedRoles: ['administrador'] }
  },
  {
    path: '/usuarios',
    name: 'Gestão de Usuários',
    component: AdminUsersView,
    meta: { requiresAuth: true, allowedRoles: ['administrador'] }
  },
  {
    path: '/carga',
    name: 'Carga Mensal',
    component: AdminLoadView,
    meta: { requiresAuth: true, allowedRoles: ['administrador'] }
  },
  {
    path: '/auditoria',
    name: 'Auditoria',
    component: AdminAuditView,
    meta: { requiresAuth: true, allowedRoles: ['administrador'] }
  },
  {
    path: '/base-projeto',
    name: 'Base Funcional',
    component: ProjectBaseView,
    meta: { requiresAuth: true, allowedRoles: ['gestor', 'administrador', 'financeiro'] }
  },
  { path: '/recuperar-senha', name: 'Recuperar Senha', component: RecuperarSenhaView }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const auth = useAuth()

  if (to.meta.requiresAuth && !auth.isAuthenticated.value) {
    next({ name: 'Login' })
  } else if (to.meta.allowedRoles && !to.meta.allowedRoles.includes(auth.role.value)) {
    useToast().showToast('Acesso negado para o seu perfil.', 'error')
    next({ name: 'Dashboard' })
  } else {
    next()
  }
})

export default router
