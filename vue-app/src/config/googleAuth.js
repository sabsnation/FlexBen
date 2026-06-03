export const GOOGLE_CLIENT_ID = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim()

let gsiInitialized = false
let credentialHandler = null

export function isGoogleLoginEnabled() {
  return Boolean(GOOGLE_CLIENT_ID)
}

export function loadGoogleScript() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Sign-In indisponível.'))
  }
  if (window.google?.accounts?.id) {
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-flexben-gsi]')
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Falha ao carregar Google.')), {
        once: true
      })
      return
    }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.dataset.flexbenGsi = '1'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Falha ao carregar Google.'))
    document.head.appendChild(script)
  })
}

function ensureGsiInitialized() {
  if (gsiInitialized || !GOOGLE_CLIENT_ID || !window.google?.accounts?.id) {
    return gsiInitialized
  }
  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (response) => {
      if (response?.credential) credentialHandler?.(response.credential)
    },
    auto_select: false,
    cancel_on_tap_outside: true
  })
  gsiInitialized = true
  return true
}

/** Uma única initialize por sessão; renderButton pode repetir ao remontar a tela. */
export function renderGoogleSignInButton(container, onCredential) {
  if (!GOOGLE_CLIENT_ID || !container || !window.google?.accounts?.id) {
    return false
  }
  credentialHandler = onCredential
  if (!ensureGsiInitialized()) return false
  container.replaceChildren()
  window.google.accounts.id.renderButton(container, {
    theme: 'outline',
    size: 'large',
    width: Math.min(400, container.offsetWidth || 360),
    text: 'continue_with',
    locale: 'pt-BR'
  })
  return true
}
