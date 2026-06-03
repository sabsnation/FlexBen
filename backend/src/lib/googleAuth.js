import { OAuth2Client } from 'google-auth-library'

function getClientId() {
  return String(process.env.GOOGLE_CLIENT_ID || '').trim()
}

export function isGoogleAuthConfigured() {
  return Boolean(getClientId())
}

export async function verifyGoogleCredential(credential) {
  const clientId = getClientId()
  if (!clientId) {
    throw new Error('Login com Google não configurado no servidor.')
  }
  const client = new OAuth2Client(clientId)
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: clientId
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
}
