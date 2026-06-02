import { prisma } from './prisma.js'

const WORKFLOW_PENDING = ['Em análise', 'Pendente']

export async function upsertNotification(userId, dedupeKey, data) {
  if (!dedupeKey) {
    return prisma.notification.create({
      data: {
        userId,
        title: data.title,
        message: data.message,
        type: data.type || 'info',
        link: data.link || null,
        read: false,
        createdAt: new Date().toISOString()
      }
    })
  }

  return prisma.notification.upsert({
    where: {
      userId_dedupeKey: { userId, dedupeKey }
    },
    create: {
      userId,
      dedupeKey,
      title: data.title,
      message: data.message,
      type: data.type || 'info',
      link: data.link || null,
      read: false,
      createdAt: new Date().toISOString()
    },
    update: {
      title: data.title,
      message: data.message,
      type: data.type || 'info',
      link: data.link || null
    }
  })
}

export async function removeDedupeNotification(userId, dedupeKey) {
  try {
    await prisma.notification.delete({
      where: { userId_dedupeKey: { userId, dedupeKey } }
    })
  } catch {
    /* not found */
  }
}

export async function syncNotificationsForUser(user) {
  const userId = user.id
  const role = user.role

  if (['gestor', 'administrador'].includes(role)) {
    // Conta utilização (Saída) + realocações/alocações do financeiro (excluindo o par Entrada auto-decidido)
    const pendingApprovals = await prisma.transaction.count({
      where: {
        status: { in: WORKFLOW_PENDING },
        NOT: {
          AND: [
            { tipo: 'Entrada' },
            { descricao: { startsWith: 'Realocação de' } }
          ]
        }
      }
    })
    if (pendingApprovals > 0) {
      await upsertNotification(userId, 'pending-approvals', {
        title: 'Aprovações pendentes',
        message: `${pendingApprovals} operação(ões) do financeiro aguardam decisão gerencial.`,
        link: '/gestor/aprovacoes',
        type: 'warning'
      })
    } else {
      await removeDedupeNotification(userId, 'pending-approvals')
    }

    const pendingCeilings = await prisma.benefitCeilingProposal.count({
      where: { status: { in: WORKFLOW_PENDING } }
    })
    if (pendingCeilings > 0) {
      await upsertNotification(userId, 'pending-ceilings', {
        title: 'Tetos aguardando aprovação',
        message: `${pendingCeilings} proposta(s) de teto precisam de análise.`,
        link: '/gestor/aprovacoes',
        type: 'info'
      })
    } else {
      await removeDedupeNotification(userId, 'pending-ceilings')
    }
  }

  if (role === 'financeiro') {
    const pendingCeilingsFinance = await prisma.benefitCeilingProposal.count({
      where: { requesterEmail: user.email, status: { in: WORKFLOW_PENDING } }
    })
    // Conta operações submetidas PELO financeiro (via actorEmail no evento inicial)
    // que ainda estão pendentes, excluindo o par Entrada auto-decidido de realocações
    const pendingFinanceOps = await prisma.workflowEvent.count({
      where: {
        actorEmail: user.email,
        fromStatus: null,
        transaction: {
          status: { in: WORKFLOW_PENDING },
          NOT: {
            AND: [
              { tipo: 'Entrada' },
              { descricao: { startsWith: 'Realocação de' } }
            ]
          }
        }
      }
    })
    const total = pendingCeilingsFinance + pendingFinanceOps
    if (total > 0) {
      await upsertNotification(userId, 'finance-ops-pending', {
        title: 'Operações aguardando aprovação',
        message: `${total} operação(ões) enviada(s) aguardam decisão do gestor.`,
        link: '/transacoes',
        type: 'warning'
      })
    } else {
      await removeDedupeNotification(userId, 'finance-ops-pending')
    }
  }

  if (role === 'colaborador') {
    const myPending = await prisma.transaction.count({
      where: {
        userId,
        tipo: 'Saída',
        status: { in: WORKFLOW_PENDING }
      }
    })
    if (myPending > 0) {
      await upsertNotification(userId, 'my-pending-usage', {
        title: 'Uso em análise',
        message: `${myPending} registro(s) aguardam aprovação do gestor.`,
        link: '/transacoes',
        type: 'info'
      })
    } else {
      await removeDedupeNotification(userId, 'my-pending-usage')
    }
  }
}

export function serializeNotification(row) {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    type: row.type,
    link: row.link || '',
    read: Boolean(row.read),
    createdAt: row.createdAt
  }
}
