import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from './auth'
import { useToast } from './toast'
import { HOME_ROUTE, LOGIN_ROUTE, GUEST_ONLY_PATHS } from './config/appRoutes.js'
import LoginView from './views/LoginView.vue'

const lazy = (loader) => () => loader()

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', name: 'Login', component: LoginView },
  {
    path: '/cadastro',
    name: 'Cadastro',
    component: lazy(() => import('./views/CadastroView.vue')),
    meta: { requiresAuth: true, allowedRoles: ['administrador'] }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: lazy(() => import('./views/DashboardView.vue')),
    meta: { requiresAuth: true, allowedRoles: ['colaborador', 'gestor', 'administrador', 'financeiro'] }
  },
  { path: '/transferencia', redirect: '/realocar' },
  {
    path: '/realocar',
    name: 'Realocar créditos',
    component: lazy(() => import('./views/RealocacaoView.vue')),
    meta: {
      requiresAuth: true,
      allowedRoles: ['colaborador', 'gestor', 'administrador', 'financeiro']
    }
  },
  {
    path: '/utilizacao',
    name: 'Registrar utilização',
    component: lazy(() => import('./views/UtilizacaoView.vue')),
    meta: {
      requiresAuth: true,
      allowedRoles: ['colaborador']
    }
  },
  {
    path: '/transacoes',
    name: 'Histórico',
    component: lazy(() => import('./views/TransacoesView.vue')),
    meta: { requiresAuth: true, allowedRoles: ['colaborador', 'gestor', 'administrador', 'financeiro'] }
  },
  {
    path: '/consulta-categorias',
    name: 'Categorias de benefícios',
    component: lazy(() => import('./views/CategoriasConsultaView.vue')),
    meta: { requiresAuth: true, allowedRoles: ['colaborador', 'gestor', 'administrador', 'financeiro'] }
  },
  {
    path: '/gestor/aprovacoes',
    name: 'Aprovações do Gestor',
    component: lazy(() => import('./views/ManagerApprovalsView.vue')),
    meta: { requiresAuth: true, allowedRoles: ['gestor', 'administrador'] }
  },
  {
    path: '/rh/politicas',
    name: 'Políticas e Orçamento',
    component: lazy(() => import('./views/RhPolicyBudgetView.vue')),
    meta: { requiresAuth: true, allowedRoles: ['administrador'] }
  },
  {
    path: '/financeiro/fechamento',
    name: 'Fechamento Mensal',
    component: lazy(() => import('./views/FinanceClosingView.vue')),
    meta: { requiresAuth: true, allowedRoles: ['financeiro', 'administrador'] }
  },
  {
    path: '/categorias',
    name: 'Gestão de Categorias',
    component: lazy(() => import('./views/CategoriasView.vue')),
    meta: { requiresAuth: true, allowedRoles: ['administrador'] }
  },
  {
    path: '/usuarios',
    name: 'Gestão de Usuários',
    component: lazy(() => import('./views/AdminUsersView.vue')),
    meta: { requiresAuth: true, allowedRoles: ['administrador'] }
  },
  {
    path: '/carga',
    name: 'Carga Mensal',
    component: lazy(() => import('./views/AdminLoadView.vue')),
    meta: { requiresAuth: true, allowedRoles: ['administrador'] }
  },
  {
    path: '/alocar-creditos',
    name: 'Alocar créditos',
    component: lazy(() => import('./views/CreditAllocationView.vue')),
    meta: { requiresAuth: true, allowedRoles: ['financeiro', 'gestor', 'administrador'] }
  },
  {
    path: '/financeiro/tetos',
    name: 'Tetos de benefícios',
    component: lazy(() => import('./views/BenefitCeilingsView.vue')),
    meta: { requiresAuth: true, allowedRoles: ['financeiro', 'gestor', 'administrador'] }
  },
  {
    path: '/auditoria',
    name: 'Auditoria',
    component: lazy(() => import('./views/AdminAuditView.vue')),
    meta: { requiresAuth: true, allowedRoles: ['administrador'] }
  },
  {
    path: '/recuperar-senha',
    name: 'Recuperar Senha',
    component: lazy(() => import('./views/RecuperarSenhaView.vue'))
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, _from, next) => {
  const auth = useAuth()

  if (to.path === '/') {
    return next(auth.isAuthenticated.value ? HOME_ROUTE : LOGIN_ROUTE)
  }

  if (auth.isAuthenticated.value && GUEST_ONLY_PATHS.includes(to.path)) {
    return next(HOME_ROUTE)
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated.value) {
    return next({ name: 'Login' })
  }

  if (to.meta.allowedRoles && !to.meta.allowedRoles.includes(auth.role.value)) {
    useToast().showToast('Acesso negado para o seu perfil.', 'error')
    return next(HOME_ROUTE)
  }

  next()
})

export default router
