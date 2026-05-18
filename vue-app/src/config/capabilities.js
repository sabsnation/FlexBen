export const CAPABILITIES = Object.freeze({
  transaction_view: ['colaborador', 'gestor', 'administrador', 'financeiro'],
  credit_reallocate: ['colaborador', 'gestor', 'administrador'],
  usage_register: ['colaborador', 'gestor', 'administrador', 'financeiro'],
  approval_decide: ['gestor', 'administrador'],
  policy_manage: ['administrador'],
  monthly_load_run: ['administrador'],
  closing_run: ['financeiro', 'administrador'],
  audit_view: ['administrador']
})

export function roleCan(role, capability) {
  const allowed = CAPABILITIES[capability] || []
  return allowed.includes(role)
}
