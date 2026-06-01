/**
 * Libera a porta TCP antes de subir o dev server (evita EADDRINUSE após sessões antigas).
 */
import { execSync } from 'child_process'

const port = Number(process.argv[2] || process.env.PORT || 3333)
if (!port) process.exit(0)

try {
  const out = execSync(`lsof -t -i:${port} 2>/dev/null`, { encoding: 'utf8' }).trim()
  if (!out) process.exit(0)
  const pids = [...new Set(out.split(/\s+/).filter(Boolean))]
  for (const pid of pids) {
    try {
      execSync(`kill ${pid}`)
    } catch {
      /* processo já encerrou */
    }
  }
  console.log(`[dev] Porta ${port} liberada (PID(s): ${pids.join(', ')})`)
} catch {
  /* nada escutando na porta */
}
