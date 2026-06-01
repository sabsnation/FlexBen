export const NAV_SECTIONS = Object.freeze([
  {
    id: 'beneficios',
    title: 'Meus Benefícios',
    roles: ['colaborador', 'gestor', 'administrador', 'financeiro'],
    items: [
      { to: '/dashboard', label: 'Painel', icon: 'dashboard', capability: 'transaction_view' },
      {
        to: '/realocar',
        label: 'Realocar créditos',
        icon: 'swap',
        capability: 'credit_reallocate'
      },
      {
        to: '/utilizacao',
        label: 'Registrar uso',
        icon: 'send',
        capability: 'usage_register'
      },
      { to: '/transacoes', label: 'Transações', icon: 'list', capability: 'transaction_view' },
      {
        to: '/consulta-categorias',
        label: 'Categorias',
        icon: 'grid',
        capability: 'transaction_view'
      }
    ]
  },
  {
    id: 'gestor',
    title: 'Gestão',
    roles: ['gestor', 'administrador'],
    items: [
      {
        to: '/gestor/aprovacoes',
        label: 'Aprovações',
        icon: 'check-circle',
        capability: 'approval_decide'
      }
    ]
  },
  {
    id: 'financeiro',
    title: 'Financeiro',
    roles: ['financeiro', 'gestor', 'administrador'],
    items: [
      {
        to: '/financeiro/tetos',
        label: 'Tetos de benefícios',
        icon: 'target',
        capability: 'ceiling_propose'
      },
      {
        to: '/alocar-creditos',
        label: 'Alocar créditos',
        icon: 'dollar-sign',
        capability: 'credit_allocate'
      },
      {
        to: '/financeiro/fechamento',
        label: 'Fechamento Mensal',
        icon: 'bar-chart',
        capability: 'closing_run'
      }
    ]
  },
  {
    id: 'rh',
    title: 'RH / Admin',
    roles: ['administrador'],
    items: [
      { to: '/rh/politicas', label: 'Painel Executivo', icon: 'pie-chart', capability: 'policy_manage' },
      { to: '/categorias', label: 'Categorias & Limites', icon: 'layers', capability: 'policy_manage' },
      { to: '/usuarios', label: 'Usuários', icon: 'users', capability: 'policy_manage' },
      { to: '/carga', label: 'Carga Mensal', icon: 'upload', capability: 'monthly_load_run' },
      { to: '/auditoria', label: 'Auditoria', icon: 'shield', capability: 'audit_view' }
    ]
  }
])
