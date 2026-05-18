export const NAV_SECTIONS = Object.freeze([
  {
    id: 'colaborador',
    title: 'Meus Benefícios',
    roles: ['colaborador', 'gestor', 'administrador', 'financeiro'],
    items: [
      { to: '/dashboard', label: 'Painel', icon: '▣' },
      { to: '/realocar', label: 'Realocar créditos', icon: '⇄' },
      { to: '/utilizacao', label: 'Registrar uso', icon: '◔' },
      { to: '/transacoes', label: 'Transações', icon: '↻' },
      { to: '/consulta-categorias', label: 'Categorias', icon: '▤' }
    ]
  },
  {
    id: 'gestor',
    title: 'Gestão',
    roles: ['gestor', 'administrador'],
    items: [
      { to: '/gestor/aprovacoes', label: 'Aprovações', icon: '✓' }
    ]
  },
  {
    id: 'rh',
    title: 'RH / Admin',
    roles: ['administrador'],
    items: [
      { to: '/rh/politicas', label: 'Painel Executivo', icon: '◐' },
      { to: '/categorias', label: 'Categorias & Limites', icon: '▤' },
      { to: '/usuarios', label: 'Usuários', icon: '◉' },
      { to: '/carga', label: 'Carga Mensal', icon: '⇪' },
      { to: '/auditoria', label: 'Auditoria', icon: '⎘' }
    ]
  },
  {
    id: 'financeiro',
    title: 'Financeiro',
    roles: ['financeiro', 'administrador'],
    items: [
      { to: '/financeiro/fechamento', label: 'Fechamento Mensal', icon: '$' }
    ]
  },
  {
    id: 'governanca',
    title: 'Governança',
    roles: ['administrador', 'gestor', 'financeiro'],
    items: [
      { to: '/base-projeto', label: 'Base Funcional', icon: '☰' }
    ]
  }
])
