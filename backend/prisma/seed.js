import prismaPkg from '@prisma/client'
import bcrypt from 'bcrypt'

const { PrismaClient } = prismaPkg
const prisma = new PrismaClient()

async function main() {
  const hash = await bcrypt.hash('123', 10)

  const users = [
    {
      nome: 'Admin RH',
      email: 'admin@empresa.com',
      passwordHash: hash,
      role: 'administrador',
      status: 'Ativo',
      dataCadastro: '01/04/2026'
    },
    {
      nome: 'Sabrina Admin',
      email: 'sabrina.admin@empresa.com',
      passwordHash: hash,
      role: 'administrador',
      status: 'Ativo',
      dataCadastro: '15/04/2026'
    },
    {
      nome: 'João Silva',
      email: 'joao.silva@empresa.com',
      passwordHash: hash,
      role: 'colaborador',
      status: 'Ativo',
      dataCadastro: '10/04/2026'
    },
    {
      nome: 'Paulo Gestor',
      email: 'gestor@empresa.com',
      passwordHash: hash,
      role: 'gestor',
      status: 'Ativo',
      dataCadastro: '02/04/2026'
    },
    {
      nome: 'Fernanda Financeiro',
      email: 'financeiro@empresa.com',
      passwordHash: hash,
      role: 'financeiro',
      status: 'Ativo',
      dataCadastro: '03/04/2026'
    },
    {
      nome: 'Ana Souza',
      email: 'ana.souza@empresa.com',
      passwordHash: hash,
      role: 'colaborador',
      status: 'Ativo',
      dataCadastro: '21/04/2026'
    },
    {
      nome: 'Carlos Lima',
      email: 'carlos.lima@empresa.com',
      passwordHash: hash,
      role: 'colaborador',
      status: 'Ativo',
      dataCadastro: '22/04/2026'
    },
    {
      nome: 'Marina Costa',
      email: 'marina.costa@empresa.com',
      passwordHash: hash,
      role: 'colaborador',
      status: 'Inativo',
      dataCadastro: '25/04/2026'
    }
  ]
  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      create: user,
      update: {
        nome: user.nome,
        role: user.role,
        status: user.status,
        dataCadastro: user.dataCadastro
      }
    })
  }

  const categories = [
    { nome: 'Alimentação', limite: 800, status: 'Ativa' },
    { nome: 'Mobilidade', limite: 300, status: 'Ativa' },
    { nome: 'Saúde', limite: 500, status: 'Ativa' },
    { nome: 'Educação', limite: 400, status: 'Ativa' },
    { nome: 'Cultura', limite: 200, status: 'Ativa' },
    { nome: 'Bem-estar', limite: 250, status: 'Inativa' }
  ]
  for (const category of categories) {
    const existing = await prisma.category.findFirst({
      where: { nome: category.nome }
    })
    if (!existing) {
      await prisma.category.create({ data: category })
      continue
    }
    await prisma.category.update({
      where: { id: existing.id },
      data: { limite: category.limite, status: category.status }
    })
  }

  const policyRules = [
    {
      role: 'colaborador',
      category: 'Alimentação',
      costCenter: '*',
      maxPerTransaction: 250,
      monthlyCap: 800,
      requiresApproval: false,
      active: true
    },
    {
      role: 'colaborador',
      category: 'Mobilidade',
      costCenter: '*',
      maxPerTransaction: 150,
      monthlyCap: 300,
      requiresApproval: false,
      active: true
    },
    {
      role: 'colaborador',
      category: 'Educação',
      costCenter: '*',
      maxPerTransaction: 200,
      monthlyCap: 400,
      requiresApproval: true,
      active: true
    },
    {
      role: 'gestor',
      category: 'Educação',
      costCenter: '*',
      maxPerTransaction: 400,
      monthlyCap: 600,
      requiresApproval: false,
      active: true
    },
    {
      role: 'financeiro',
      category: 'Saúde',
      costCenter: '*',
      maxPerTransaction: 500,
      monthlyCap: 700,
      requiresApproval: false,
      active: true
    }
  ]
  for (const rule of policyRules) {
    const existing = await prisma.policyRule.findFirst({
      where: {
        role: rule.role,
        category: rule.category,
        costCenter: rule.costCenter
      }
    })
    if (!existing) {
      await prisma.policyRule.create({ data: rule })
      continue
    }
    await prisma.policyRule.update({
      where: { id: existing.id },
      data: {
        maxPerTransaction: rule.maxPerTransaction,
        monthlyCap: rule.monthlyCap,
        requiresApproval: rule.requiresApproval,
        active: rule.active
      }
    })
  }

  const createdUsers = await prisma.user.findMany()
  const idByEmail = Object.fromEntries(createdUsers.map((u) => [u.email, u.id]))
  const tx = []
  const baseCreditRows = [
    ['joao.silva@empresa.com', 'Alimentação', 800],
    ['joao.silva@empresa.com', 'Mobilidade', 300],
    ['joao.silva@empresa.com', 'Saúde', 500],
    ['ana.souza@empresa.com', 'Alimentação', 800],
    ['ana.souza@empresa.com', 'Educação', 400],
    ['carlos.lima@empresa.com', 'Alimentação', 800],
    ['carlos.lima@empresa.com', 'Mobilidade', 300]
  ]
  for (const [email, categoria, valor] of baseCreditRows) {
    tx.push({
      userId: idByEmail[email],
      data: '01/05/2026',
      tipo: 'Entrada',
      categoria,
      valor,
      status: 'Concluída',
      descricao: `Carga mensal — ${categoria}`
    })
  }

  tx.push(
    {
      userId: idByEmail['joao.silva@empresa.com'],
      data: '03/05/2026',
      tipo: 'Saída',
      categoria: 'Alimentação',
      valor: 180,
      status: 'Concluída',
      descricao: 'Refeição — Almoço equipe'
    },
    {
      userId: idByEmail['joao.silva@empresa.com'],
      data: '04/05/2026',
      tipo: 'Saída',
      categoria: 'Mobilidade',
      valor: 90,
      status: 'Concluída',
      descricao: 'Aplicativo de transporte'
    },
    {
      userId: idByEmail['joao.silva@empresa.com'],
      data: '05/05/2026',
      tipo: 'Entrada',
      categoria: 'Saúde',
      valor: 120,
      status: 'Concluída',
      descricao: 'Realocação de Alimentação'
    },
    {
      userId: idByEmail['ana.souza@empresa.com'],
      data: '05/05/2026',
      tipo: 'Saída',
      categoria: 'Educação',
      valor: 220,
      status: 'Concluída',
      descricao: 'Curso online'
    },
    {
      userId: idByEmail['ana.souza@empresa.com'],
      data: '06/05/2026',
      tipo: 'Saída',
      categoria: 'Alimentação',
      valor: 95,
      status: 'Em análise',
      descricao: 'Solicitação de reembolso de mercado'
    },
    {
      userId: idByEmail['carlos.lima@empresa.com'],
      data: '07/05/2026',
      tipo: 'Saída',
      categoria: 'Mobilidade',
      valor: 110,
      status: 'Concluída',
      descricao: 'Vale transporte complementar'
    },
    {
      userId: idByEmail['carlos.lima@empresa.com'],
      data: '08/05/2026',
      tipo: 'Saída',
      categoria: 'Educação',
      valor: 180,
      status: 'Pendente',
      descricao: 'Solicitação de curso de certificação'
    }
  )

  await prisma.transaction.deleteMany({
    where: { descricao: { contains: '[seed]' } }
  })
  const txWithTag = tx.map((row) => ({
    ...row,
    descricao: `${row.descricao} [seed]`
  }))
  await prisma.transaction.createMany({ data: txWithTag })
  const createdTx = await prisma.transaction.findMany({
    where: { descricao: { contains: '[seed]' } },
    orderBy: { id: 'asc' }
  })
  await prisma.workflowEvent.createMany({
    data: createdTx.map((row) => ({
      transactionId: row.id,
      fromStatus: null,
      toStatus: row.status,
      actorEmail: 'seed@system',
      note: 'Estado inicial de seed',
      createdAt: new Date().toISOString()
    }))
  })

  console.log('Seed OK (senha demo: 123)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
