export const NAV_SECTIONS = Object.freeze([
  {
    id: 'colaborador',
    title: 'Meus Benefícios',
    roles: ['colaborador', 'gestor', 'administrador', 'financeiro'],
    items: [
      { to: '/dashboard', label: 'Painel', icon: 'dashboard' },
      { to: '/realocar', label: 'Realocar créditos', icon: 'swap' },
      { to: '/utilizacao', label: 'Registrar uso', icon: 'send' },
      { to: '/transacoes', label: 'Transações', icon: 'list' },
      { to: '/consulta-categorias', label: 'Categorias', icon: 'grid' }
    ]
  },
  {
    id: 'gestor',
    title: 'Gestão',
    roles: ['gestor', 'administrador'],
    items: [
      { to: '/gestor/aprovacoes', label: 'Aprovações', icon: 'check-circle' }
    ]
  },
  {
    id: 'rh',
    title: 'RH / Admin',
    roles: ['administrador'],
    items: [
      { to: '/rh/politicas', label: 'Painel Executivo', icon: 'pie-chart' },
      { to: '/categorias', label: 'Categorias & Limites', icon: 'layers' },
      { to: '/usuarios', label: 'Usuários', icon: 'users' },
      { to: '/carga', label: 'Carga Mensal', icon: 'upload' },
      { to: '/auditoria', label: 'Auditoria', icon: 'shield' }
    ]
  },
  {
    id: 'financeiro',
    title: 'Financeiro',
    roles: ['financeiro', 'administrador'],
    items: [
      { to: '/financeiro/fechamento', label: 'Fechamento Mensal', icon: 'dollar-sign' }
    ]
  },
  {
    id: 'governanca',
    title: 'Governança',
    roles: ['administrador', 'gestor', 'financeiro'],
    items: [
      { to: '/base-projeto', label: 'Base Funcional', icon: 'file-text' }
    ]
  }
])
