import { prisma } from './prisma.js'
import { upsertNotification, removeDedupeNotification } from './notifications.js'
import { NOTIFICATION_EVENTS } from './notificationEvents.js'

const MANAGER_ROLES = ['gestor', 'administrador']

const OP_LABELS = {
  realocacao: 'realocação',
  alocacao: 'alocação de crédito',
  utilizacao: 'utilização',
  carga: 'carga mensal'
}

async function findManagers() {
  return prisma.user.findMany({
    where: { role: { in: MANAGER_ROLES }, status: 'Ativo' }
  })
}

async function findUserByEmail(email) {
  if (!email) return null
  return prisma.user.findFirst({
    where: { email: String(email).toLowerCase() }
  })
}

async function notifyManagers(dedupeKey, data) {
  const managers = await findManagers()
  await Promise.all(
    managers.map((m) => upsertNotification(m.id, dedupeKey, data))
  )
}

/**
 * Processa um evento da fila e persiste notificações no banco.
 */
export async function handleNotificationEvent(event) {
  if (!event?.type) return

  switch (event.type) {
    case NOTIFICATION_EVENTS.APPROVAL_SUBMITTED: {
      const {
        transactionId,
        actorEmail,
        beneficiaryName,
        operationType,
        category,
        amount,
        description
      } = event.payload || {}
      const opLabel = OP_LABELS[operationType] || 'operação'
      const valor = Number(amount) || 0
      const valorFmt = valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      await notifyManagers(`approval-tx-${transactionId}`, {
        title: 'Nova operação para aprovar',
        message: `${actorEmail} solicitou ${opLabel} (${category}, ${valorFmt}) para ${beneficiaryName || 'colaborador'}. ${description || ''}`.trim(),
        link: '/gestor/aprovacoes',
        type: 'warning'
      })
      break
    }

    case NOTIFICATION_EVENTS.APPROVAL_DECIDED: {
      const { transactionId, decision, actorEmail, beneficiaryUserId, description } =
        event.payload || {}
      const submitter = await findUserByEmail(actorEmail)
      const approved = decision === 'aprovado'
      const title = approved ? 'Operação aprovada' : 'Operação reprovada'
      const message = `O gestor ${approved ? 'aprovou' : 'reprovou'}: ${description || 'sua solicitação'}.`

      if (submitter?.role === 'financeiro') {
        await upsertNotification(submitter.id, `decision-tx-${transactionId}-finance`, {
          title,
          message,
          link: '/transacoes',
          type: approved ? 'success' : 'danger'
        })
      }

      if (beneficiaryUserId && beneficiaryUserId !== submitter?.id) {
        await upsertNotification(beneficiaryUserId, `decision-tx-${transactionId}-user`, {
          title,
          message: approved
            ? 'Uma movimentação na sua conta foi aprovada pelo gestor.'
            : 'Uma movimentação na sua conta foi reprovada pelo gestor.',
          link: '/transacoes',
          type: approved ? 'success' : 'danger'
        })
      }

      // Atualiza contadores deduplicados dos gestores
      const managers = await findManagers()
      await Promise.all(managers.map((m) => refreshManagerPendingCounts(m.id)))
      break
    }

    case NOTIFICATION_EVENTS.CEILING_SUBMITTED: {
      const { proposalId, requesterEmail, categoryName, requestType, proposedMonthlyCap } =
        event.payload || {}
      const typeLabel =
        requestType === 'create' ? 'criação' : requestType === 'increase' ? 'aumento' : 'redução'
      const cap = Number(proposedMonthlyCap) || 0
      const capFmt = cap.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      await notifyManagers(`ceiling-${proposalId}`, {
        title: 'Proposta de teto para aprovar',
        message: `${requesterEmail} solicitou ${typeLabel} de teto em ${categoryName} (${capFmt}).`,
        link: '/gestor/aprovacoes',
        type: 'info'
      })
      break
    }

    case NOTIFICATION_EVENTS.CEILING_DECIDED: {
      const { proposalId, requesterEmail, decision, categoryName } = event.payload || {}
      const requester = await findUserByEmail(requesterEmail)
      if (!requester) break
      const approved = decision === 'aprovado'
      await upsertNotification(requester.id, `ceiling-decision-${proposalId}`, {
        title: approved ? 'Teto aprovado' : 'Teto reprovado',
        message: approved
          ? `Sua proposta de teto para ${categoryName} foi aprovada e aplicada.`
          : `Sua proposta de teto para ${categoryName} foi reprovada.`,
        link: '/gestor/aprovacoes',
        type: approved ? 'success' : 'danger'
      })
      break
    }

    case NOTIFICATION_EVENTS.USAGE_SUBMITTED: {
      const { transactionId, userId, category, amount } = event.payload || {}
      const valorFmt = (Number(amount) || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      })
      await notifyManagers(`usage-tx-${transactionId}`, {
        title: 'Utilização aguardando aprovação',
        message: `Nova utilização em ${category} (${valorFmt}) precisa de decisão.`,
        link: '/gestor/aprovacoes',
        type: 'warning'
      })
      if (userId) {
        await upsertNotification(userId, `my-usage-${transactionId}`, {
          title: 'Uso enviado para análise',
          message: `Sua utilização em ${category} aguarda aprovação do gestor.`,
          link: '/transacoes',
          type: 'info'
        })
      }
      break
    }

    default:
      console.warn('[notifications] Evento desconhecido:', event.type)
  }
}

async function refreshManagerPendingCounts(managerId) {
  const WORKFLOW_PENDING = ['Em análise', 'Pendente']
  const pendingApprovals = await prisma.transaction.count({
    where: {
      status: { in: WORKFLOW_PENDING },
      NOT: {
        AND: [{ tipo: 'Entrada' }, { descricao: { startsWith: 'Realocação de' } }]
      }
    }
  })
  if (pendingApprovals > 0) {
    await upsertNotification(managerId, 'pending-approvals', {
      title: 'Aprovações pendentes',
      message: `${pendingApprovals} operação(ões) aguardam decisão gerencial.`,
      link: '/gestor/aprovacoes',
      type: 'warning'
    })
  } else {
    await removeDedupeNotification(managerId, 'pending-approvals')
  }
}
