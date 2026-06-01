/**
 * Camada de serviço: cálculos e regras sobre transações e benefícios.
 */

export function balanceForCategory(transactions, userEmail, categoria) {
  const email = String(userEmail || '').toLowerCase()
  const cat = String(categoria || '').trim()
  const credit = transactions
    .filter(
      (t) =>
        String(t.userEmail || '').toLowerCase() === email &&
        t.tipo === 'Entrada' &&
        t.categoria === cat
    )
    .reduce((acc, t) => acc + Number(t.valor || 0), 0)
  const debit = transactions
    .filter(
      (t) =>
        String(t.userEmail || '').toLowerCase() === email &&
        t.tipo === 'Saída' &&
        t.categoria === cat
    )
    .reduce((acc, t) => acc + Number(t.valor || 0), 0)
  return credit - debit
}

export function totalBalanceFromTransactions(transactions, userEmail) {
  const email = userEmail.toLowerCase()
  const mine = transactions.filter((t) => t.userEmail === email)
  return mine.reduce((acc, item) => {
    return item.tipo === 'Entrada' ? acc + item.valor : acc - item.valor
  }, 0)
}

/**
 * Monta o par débito/crédito para transferência entre usuários (mesma categoria).
 */
export function buildPeerBenefitTransfer({
  senderNome,
  senderEmail,
  recipientNome,
  recipientEmail,
  categoria,
  valor,
  descricaoExtra
}) {
  const extra = descricaoExtra ? ` — ${descricaoExtra}` : ''
  const out = {
    userEmail: senderEmail.toLowerCase(),
    tipo: 'Saída',
    categoria,
    valor,
    descricao: `Transferência para ${recipientNome} (${recipientEmail})${extra}`
  }
  const inc = {
    userEmail: recipientEmail.toLowerCase(),
    tipo: 'Entrada',
    categoria,
    valor,
    descricao: `Recebido de ${senderNome} (${senderEmail})${extra}`
  }
  return { out, inc }
}

export function assertPeerTransfer({
  senderEmail,
  recipientRecord,
  valor,
  categoryBalance
}) {
  const me = (senderEmail || '').trim().toLowerCase()
  if (!me) {
    throw new Error('Sessão inválida.')
  }
  if (!recipientRecord) {
    throw new Error('Destinatário não encontrado. Verifique o e-mail cadastrado.')
  }
  const dest = recipientRecord.email.toLowerCase()
  if (dest === me) {
    throw new Error('Não é possível transferir para o próprio e-mail.')
  }
  if (recipientRecord.status !== 'Ativo') {
    throw new Error(
      'Este colaborador está inativo e não pode receber transferências.'
    )
  }
  if (!valor || valor <= 0) {
    throw new Error('Informe um valor válido.')
  }
  if (categoryBalance - valor < 0) {
    throw new Error('Saldo insuficiente nesta categoria.')
  }
}
