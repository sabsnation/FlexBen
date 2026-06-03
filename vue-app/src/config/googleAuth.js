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

  const existing = document.querySelector('script[data-flexben-gsi]')
  if (existing) {
    return new Promise((resolve, reject) => {
      const finish = () => {
        if (window.google?.accounts?.id) resolve()
        else reject(new Error('Script Google carregou sem API GSI.'))
      }
      if (window.google?.accounts?.id) {
        resolve()
        return
      }
      existing.addEventListener('load', finish, { once: true })
      existing.addEventListener('error', () => reject(new Error('Falha ao carregar Google.')), {
        once: true
      })
      setTimeout(finish, 3000)
    })
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.dataset.flexbenGsi = '1'
    script.onload = () => {
      if (window.google?.accounts?.id) resolve()
      else reject(new Error('Script Google carregou sem API GSI.'))
    }
    script.onerror = () => reject(new Error('Falha ao carregar Google.'))
    document.head.appendChild(script)
  })
}

function ensureGsiInitialized() {
  if (!GOOGLE_CLIENT_ID || !window.google?.accounts?.id) {
    return false
  }
  if (!gsiInitialized) {
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => {
        if (response?.credential) credentialHandler?.(response.credential)
      },
      auto_select: false,
      cancel_on_tap_outside: true
    })
    gsiInitialized = true
  }
  return true
}

/** Uma única initialize por sessão; renderButton pode repetir ao remontar a tela. */
export function renderGoogleSignInButton(container, onCredential) {
  if (!GOOGLE_CLIENT_ID || !container) {
    return false
  }
  if (!window.google?.accounts?.id) {
    return false
  }
  credentialHandler = onCredential
  if (!ensureGsiInitialized()) return false

  container.replaceChildren()
  const width = Math.max(280, Math.min(400, container.offsetWidth || 360))
  window.google.accounts.id.renderButton(container, {
    theme: 'outline',
    size: 'large',
    width,
    text: 'continue_with',
    locale: 'pt-BR'
  })
  return container.childElementCount > 0
}

/** Fallback quando o iframe do botão não renderiza (ex.: origem OAuth). */
export async function promptGoogleSignIn(onCredential) {
  if (!GOOGLE_CLIENT_ID) return false
  await loadGoogleScript()
  credentialHandler = onCredential
  if (!ensureGsiInitialized()) return false
  window.google.accounts.id.prompt()
  return true
}
