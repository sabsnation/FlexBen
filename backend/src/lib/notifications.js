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
      link: data.link || null,
      read: false,
      createdAt: new Date().toISOString()
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
    const pendingApprovals = await prisma.transaction.count({
      where: {
        tipo: 'Saída',
        status: { in: WORKFLOW_PENDING }
      }
    })
    if (pendingApprovals > 0) {
      await upsertNotification(userId, 'pending-approvals', {
        title: 'Aprovações pendentes',
        message: `${pendingApprovals} solicitação(ões) aguardam decisão gerencial.`,
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

  if (['financeiro', 'gestor', 'administrador'].includes(role)) {
    const pendingCeilingsFinance = await prisma.benefitCeilingProposal.count({
      where: { status: { in: WORKFLOW_PENDING } }
    })
    if (pendingCeilingsFinance > 0 && role === 'financeiro') {
      await upsertNotification(userId, 'ceilings-submitted', {
        title: 'Propostas em análise',
        message: 'Suas solicitações de teto estão com gestor/RH.',
        type: 'info'
      })
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
    read: row.read,
    createdAt: row.createdAt
  }
}
