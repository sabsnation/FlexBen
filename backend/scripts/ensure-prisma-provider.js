/**
 * Ajusta provider do schema Prisma conforme DATABASE_URL (sqlite local / postgres no Render).
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const schemaPath = path.join(__dirname, '../prisma/schema.prisma')
const url = process.env.DATABASE_URL || ''
const provider = url.startsWith('postgres') ? 'postgresql' : 'sqlite'

let schema = fs.readFileSync(schemaPath, 'utf8')
const next = schema.replace(/provider\s*=\s*"(sqlite|postgresql)"/, `provider = "${provider}"`)

if (next !== schema) {
  fs.writeFileSync(schemaPath, next)
  console.log(`[prisma] provider → ${provider} (${url ? 'DATABASE_URL' : 'default sqlite'})`)
}
