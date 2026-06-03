/**
 * Optional SMTP (nodemailer). Install: npm install nodemailer
 * Env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, FRONTEND_URL
 */
export async function sendRecoveryEmail({ to, nome }) {
  const host = process.env.SMTP_HOST
  const from = process.env.SMTP_FROM || process.env.SMTP_USER
  if (!host || !from) return { sent: false }

  let nodemailer
  try {
    nodemailer = await import('nodemailer')
  } catch {
    console.warn('[mail] nodemailer not installed; run: npm install nodemailer')
    return { sent: false }
  }

  const loginUrl = process.env.FRONTEND_URL
    ? `${String(process.env.FRONTEND_URL).replace(/\/$/, '')}/login`
    : 'http://localhost:5173/login'

  const transport = nodemailer.default.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || '' }
      : undefined
  })

  const displayName = nome || to.split('@')[0]
  await transport.sendMail({
    from,
    to,
    subject: 'FlexBen — recuperação de acesso',
    text: [
      `Olá, ${displayName},`,
      '',
      'Recebemos uma solicitação de recuperação de acesso ao FlexBen.',
      'Se você usa login com senha (conta demo), acesse o sistema e troque a senha com o RH.',
      'Se você usa Google, entre com o botão «Entrar com Google».',
      '',
      `Acesse: ${loginUrl}`,
      '',
      'Se não foi você, ignore este e-mail.'
    ].join('\n')
  })

  return { sent: true }
}
