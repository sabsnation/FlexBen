export const CAPABILITIES = Object.freeze({
  transaction_view: ['colaborador', 'gestor', 'administrador', 'financeiro'],
  credit_reallocate: ['colaborador', 'gestor', 'administrador', 'financeiro'],
  usage_register: ['colaborador', 'gestor', 'administrador', 'financeiro'],
  approval_decide: ['gestor', 'administrador'],
  ceiling_propose: ['financeiro', 'gestor', 'administrador'],
  ceiling_approve: ['gestor', 'administrador'],
  policy_manage: ['administrador'],
  monthly_load_run: ['administrador'],
  credit_allocate: ['financeiro', 'gestor', 'administrador'],
  closing_run: ['financeiro', 'gestor', 'administrador'],
  audit_view: ['administrador']
})

export function roleCan(role, capability) {
  const allowed = CAPABILITIES[capability] || []
  return allowed.includes(role)
}
