import { OAuth2Client } from 'google-auth-library'

export function getGoogleClientIds() {
  return [
    ...new Set(
      String(process.env.GOOGLE_CLIENT_ID || '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
    )
  ]
}

export function isGoogleAuthConfigured() {
  return getGoogleClientIds().length > 0
}

function formatVerifyError(err) {
  const msg = String(err?.message || err || '')
  if (msg.includes('audience') || msg.includes('Recipient')) {
    return 'Token Google não confere com o Client ID do servidor. Confira GOOGLE_CLIENT_ID no Render (igual ao VITE_GOOGLE_CLIENT_ID).'
  }
  if (msg.includes('expired') || msg.includes('used too late')) {
    return 'Sessão Google expirada. Feche a aba e tente entrar novamente.'
  }
  if (msg.includes('Wrong number of segments')) {
    return 'Resposta do Google incompleta. Desative bloqueadores de anúncio e tente de novo.'
  }
  return msg || 'Não foi possível validar o login com Google.'
}

export async function verifyGoogleCredential(credential) {
  const audiences = getGoogleClientIds()
  if (!audiences.length) {
    throw new Error('Login com Google não configurado no servidor (defina GOOGLE_CLIENT_ID).')
  }

  const client = new OAuth2Client()
  let lastError

  for (const audience of audiences) {
    try {
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience
      })
      const payload = ticket.getPayload()
      if (!payload?.email) {
        throw new Error('Token Google sem e-mail.')
      }
      return {
        email: String(payload.email).trim().toLowerCase(),
        sub: payload.sub || null,
        name: String(payload.name || '').trim()
      }
    } catch (err) {
      lastError = err
    }
  }

  throw new Error(formatVerifyError(lastError))
}
