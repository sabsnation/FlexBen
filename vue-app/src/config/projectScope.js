export const PROJECT_SCOPE = Object.freeze({
  name: 'FlexBen',
  version: '2.0-corporativo',
  positioning:
    'Gestao corporativa de creditos flexiveis internos com governanca por perfil (colaborador, gestor, RH e financeiro).',
  actors: ['colaborador', 'gestor', 'administrador', 'financeiro'],
  processStates: ['solicitado', 'em_analise', 'aprovado', 'reprovado', 'liquidado'],
  outOfScope: [
    'Repasse para terceiros',
    'Integracao obrigatoria com operadoras de voucher',
    'Regras legais de folha e tributacao (futuro)'
  ]
})

export const FUNCTIONAL_REQUIREMENTS = Object.freeze([
  {
    id: 'RF01',
    title: 'Cadastrar usuario',
    status: 'done',
    routes: ['/cadastro'],
    actors: ['colaborador', 'administrador']
  },
  {
    id: 'RF02',
    title: 'Autenticar usuario',
    status: 'done',
    routes: ['/login'],
    actors: ['colaborador', 'administrador']
  },
  {
    id: 'RF03',
    title: 'Consultar saldo e dashboard',
    status: 'done',
    routes: ['/dashboard'],
    actors: ['colaborador', 'administrador']
  },
  {
    id: 'RF04',
    title: 'Realocar credito entre categorias e registrar uso',
    status: 'done',
    routes: ['/realocar', '/utilizacao'],
    actors: ['colaborador', 'gestor', 'administrador', 'financeiro']
  },
  {
    id: 'RF05',
    title: 'Visualizar historico de transacoes',
    status: 'done',
    routes: ['/transacoes'],
    actors: ['colaborador', 'gestor', 'administrador', 'financeiro']
  },
  {
    id: 'RF06',
    title: 'Consultar/gerenciar categorias',
    status: 'done',
    routes: ['/consulta-categorias', '/categorias'],
    actors: ['colaborador', 'administrador']
  },
  {
    id: 'RF07',
    title: 'Validar formularios e regras minimas',
    status: 'done',
    routes: ['/cadastro', '/realocar', '/utilizacao', '/categorias'],
    actors: ['colaborador', 'administrador']
  },
  {
    id: 'RF08',
    title: 'Fila de aprovacoes gerenciais',
    status: 'done',
    routes: ['/gestor/aprovacoes'],
    actors: ['gestor', 'administrador']
  },
  {
    id: 'RF09',
    title: 'Gestao de politicas e orcamento RH',
    status: 'done',
    routes: ['/rh/politicas'],
    actors: ['administrador']
  },
  {
    id: 'RF10',
    title: 'Fechamento financeiro mensal e exportacao',
    status: 'done',
    routes: ['/financeiro/fechamento'],
    actors: ['financeiro', 'administrador']
  }
])

export const NON_FUNCTIONAL_REQUIREMENTS = Object.freeze([
  {
    id: 'RNF01',
    title: 'UX simples e objetiva',
    status: 'done',
    evidence: 'Fluxos separados por contexto e feedback visual com toast'
  },
  {
    id: 'RNF02',
    title: 'Navegacao clara',
    status: 'done',
    evidence: 'Sidebar por perfil + rotas nomeadas e protegidas'
  },
  {
    id: 'RNF03',
    title: 'Base para evolucao',
    status: 'done',
    evidence: 'Catalogo central de funcionalidades, estados de processo e navegacao por dominio'
  },
  {
    id: 'RNF04',
    title: 'Codigo em camadas',
    status: 'done',
    evidence: 'views + services (dominio) + adapters/repositories (API) + auth/router como controle'
  }
])

export const SYSTEM_MODULES = Object.freeze([
  {
    id: 'MOD-AUTH',
    name: 'Identidade e Acesso',
    routes: ['/login', '/cadastro', '/recuperar-senha'],
    owner: 'Plataforma'
  },
  {
    id: 'MOD-CORE',
    name: 'Core de Beneficios Flex',
    routes: ['/dashboard', '/realocar', '/utilizacao', '/transacoes'],
    owner: 'Produto'
  },
  {
    id: 'MOD-GESTOR',
    name: 'Aprovacao Gerencial',
    routes: ['/gestor/aprovacoes'],
    owner: 'Gestao'
  },
  {
    id: 'MOD-RH',
    name: 'Administracao RH',
    routes: ['/rh/politicas', '/categorias', '/usuarios', '/carga', '/auditoria'],
    owner: 'RH/Admin'
  },
  {
    id: 'MOD-FIN',
    name: 'Operacao Financeira',
    routes: ['/financeiro/fechamento'],
    owner: 'Financeiro'
  }
])

export const ROLE_CAPABILITIES = Object.freeze({
  colaborador: [
    'Acessar dashboard',
    'Realocar credito entre categorias',
    'Registrar utilizacao',
    'Consultar transacoes',
    'Consultar categorias'
  ],
  gestor: [
    'Acessar dashboard',
    'Consultar transacoes',
    'Avaliar solicitacoes pendentes',
    'Aprovar ou reprovar com justificativa'
  ],
  financeiro: [
    'Acessar dashboard de controle',
    'Consultar consolidados mensais',
    'Executar fechamento mensal',
    'Exportar dados de fechamento'
  ],
  administrador: [
    'Todas as capacidades de colaborador, gestor e financeiro',
    'Gerenciar categorias e limites',
    'Gerenciar usuarios',
    'Executar carga mensal',
    'Consultar auditoria',
    'Definir politicas de orcamento'
  ]
})
