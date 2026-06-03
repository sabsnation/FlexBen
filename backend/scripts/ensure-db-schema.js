/**
 * Em dev local (SQLite), aplica prisma db push se o banco estiver atrás do schema
 * (ex.: coluna avatar_data ausente → erro P2022 no login).
 */
import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import 'dotenv/config'
import { prisma } from '../src/lib/prisma.js'

const backendRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

const url = process.env.DATABASE_URL || ''
if (!url.startsWith('file:')) {
  await prisma.$disconnect()
  process.exit(0)
}

try {
  await prisma.user.findFirst({
    select: { id: true, avatarData: true, authProvider: true, googleSub: true }
  })
  await prisma.notification.findFirst({ select: { id: true } })
} catch (err) {
  const staleClient =
    err?.name === 'PrismaClientValidationError' &&
    String(err.message || '').includes('authProvider')
  if (err?.code === 'P2022' || err?.code === 'P2021' || staleClient) {
    if (staleClient) {
      console.warn('[dev] Prisma Client desatualizado — rode prisma generate (dev script já faz isso).')
      execSync('npx prisma generate', { stdio: 'inherit', cwd: backendRoot })
    } else {
      console.warn('[dev] Banco SQLite desatualizado — aplicando prisma db push...')
      execSync('npx prisma db push', { stdio: 'inherit', cwd: backendRoot })
      console.log('[dev] Schema sincronizado.')
    }
  } else {
    console.error('[dev] Falha ao validar schema:', err.message)
    process.exit(1)
  }
} finally {
  await prisma.$disconnect()
}
