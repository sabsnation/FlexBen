/**
 * Fluxo principal: autenticação → consulta (dashboard) → realocação / uso de crédito flex interno.
 */
export const BENEFIT_FLOW_STEPS = Object.freeze({
  AUTENTICACAO: 'login',
  CONSULTA_SALDO: 'dashboard',
  REALOCACAO: 'realocar',
  HISTORICO: 'transacoes'
})

export const BENEFIT_FLOW_ORDER = [
  BENEFIT_FLOW_STEPS.AUTENTICACAO,
  BENEFIT_FLOW_STEPS.CONSULTA_SALDO,
  BENEFIT_FLOW_STEPS.REALOCACAO
]
