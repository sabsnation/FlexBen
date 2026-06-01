import { prisma } from './prisma.js'

const DEFAULT_EMPLOYEE_ROLES = ['colaborador', 'gestor']

export function serializeCeilingProposal(row) {
  return {
    id: row.id,
    requestType: row.requestType,
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    employeeRole: row.employeeRole,
    currentMonthlyCap: row.currentMonthlyCap != null ? Number(row.currentMonthlyCap) : null,
    proposedMonthlyCap: Number(row.proposedMonthlyCap),
    proposedMaxPerTx: row.proposedMaxPerTx != null ? Number(row.proposedMaxPerTx) : null,
    status: row.status,
    justification: row.justification || '',
    requesterEmail: row.requesterEmail,
    requesterRole: row.requesterRole,
    createdAt: row.createdAt
  }
}

export async function applyApprovedCeilingProposal(proposal) {
  const cap = Number(proposal.proposedMonthlyCap)
  const maxTx = Number(proposal.proposedMaxPerTx) || Math.round(cap * 0.35 * 100) / 100
  const categoryName = proposal.categoryName.trim()

  let category =
    proposal.categoryId != null
      ? await prisma.category.findUnique({ where: { id: proposal.categoryId } })
      : await prisma.category.findFirst({ where: { nome: categoryName } })

  if (!category) {
    category = await prisma.category.create({
      data: { nome: categoryName, limite: cap, status: 'Ativa' }
    })
  } else {
    await prisma.category.update({
      where: { id: category.id },
      data: { limite: cap, status: 'Ativa' }
    })
  }

  for (const role of DEFAULT_EMPLOYEE_ROLES) {
    const existing = await prisma.policyRule.findFirst({
      where: { role, category: category.nome, costCenter: '*' }
    })
    if (!existing) {
      await prisma.policyRule.create({
        data: {
          role,
          category: category.nome,
          costCenter: '*',
          maxPerTransaction: maxTx,
          monthlyCap: cap,
          requiresApproval: cap > 500,
          active: true
        }
      })
      continue
    }
    await prisma.policyRule.update({
      where: { id: existing.id },
      data: {
        monthlyCap: cap,
        maxPerTransaction: maxTx,
        active: true
      }
    })
  }

  return category
}

export function requiresSuperiorApproval(requestType, currentCap, proposedCap) {
  if (requestType === 'create') return true
  if (requestType === 'increase') return proposedCap > (currentCap || 0)
  return false
}
