<template>
  <div class="login-wrapper">
    <aside class="login-visual">
      <div class="visual-content">
        <RouterLink
          v-if="auth.isAuthenticated"
          to="/dashboard"
          class="brand-row brand-row--link"
          title="Ir para o painel"
        >
          <div class="brand-mark" aria-hidden="true">FB</div>
          <span class="brand-text">FlexBen · 2026</span>
        </RouterLink>
        <div v-else class="brand-row">
          <div class="brand-mark" aria-hidden="true">FB</div>
          <span class="brand-text">FlexBen · 2026</span>
        </div>

        <h1>Benefícios corporativos com<br />governança que cabe no dia a dia.</h1>
        <p>
          Plataforma única para colaboradores, gestores, RH e financeiro — com políticas, aprovações e fechamento auditável.
        </p>

        <ul class="features">
          <li class="feature">
            <span class="feature-icon"><Icon name="swap" :size="18" /></span>
            <div>
              <strong>Realocação flex</strong>
              <span>Mova créditos entre categorias respeitando políticas e tetos.</span>
            </div>
          </li>
          <li class="feature">
            <span class="feature-icon"><Icon name="check-circle" :size="18" /></span>
            <div>
              <strong>Aprovação gerencial</strong>
              <span>Fila com SLA, justificativa e trilha auditável de cada decisão.</span>
            </div>
          </li>
          <li class="feature">
            <span class="feature-icon"><Icon name="dollar-sign" :size="18" /></span>
            <div>
              <strong>Fechamento financeiro</strong>
              <span>Consolidação mensal, previsto × realizado e exportação CSV.</span>
            </div>
          </li>
        </ul>

        <div class="visual-stats">
          <div>
            <strong>4</strong>
            <span>perfis integrados</span>
          </div>
          <div>
            <strong>SQL + NoSQL</strong>
            <span>persistência híbrida</span>
          </div>
          <div>
            <strong>JWT</strong>
            <span>auth corporativa</span>
          </div>
        </div>
      </div>
      <div class="visual-bg" aria-hidden="true"></div>
      <div class="visual-glow" aria-hidden="true"></div>
    </aside>

    <section class="login-form-side">
      <div class="form-container">
        <div class="form-header">
          <span class="badge badge-primary">Login seguro</span>
          <h2>Acesse sua conta</h2>
          <p class="subtitle">Use seu e-mail corporativo. O perfil é definido pelo cadastro RH.</p>
        </div>

        <form class="form-body" @submit.prevent="handleLogin">
          <div class="form-group">
            <label>E-mail corporativo</label>
            <div class="input-wrap">
              <Icon name="mail" :size="16" class="input-icon" />
              <input
                type="email"
                placeholder="nome@empresa.com"
                v-model="email"
                autocomplete="username"
              />
            </div>
          </div>

          <div class="form-group">
            <div class="label-row">
              <label>Senha</label>
              <RouterLink class="forgot-link" to="/recuperar-senha">Esqueci minha senha</RouterLink>
            </div>
            <div class="input-wrap">
              <Icon name="lock" :size="16" class="input-icon" />
              <input
                :type="showPassword ? 'text' : 'password'"
                placeholder="••••••••"
                v-model="senha"
                autocomplete="current-password"
              />
              <button type="button" class="input-toggle" @click="showPassword = !showPassword" aria-label="Mostrar senha">
                <Icon :name="showPassword ? 'eye' : 'eye'" :size="14" />
              </button>
            </div>
          </div>

          <button class="btn btn-primary btn-lg btn-block" :disabled="loading" type="submit">
            <Icon v-if="loading" name="spinner" :size="16" class="spin" />
            <span v-if="!loading">Entrar</span>
            <span v-else>Entrando…</span>
          </button>
        </form>

        <div v-if="googleEnabled" class="google-divider">
          <span>ou</span>
        </div>
        <div v-if="googleEnabled" ref="googleBtnRef" class="google-btn-wrap"></div>
        <button
          v-if="googleEnabled && showGoogleFallback"
          type="button"
          class="btn btn-secondary btn-lg btn-block google-fallback-btn"
          :disabled="googleLoading"
          @click="retryGoogleButton"
        >
          <Icon name="user" :size="16" />
          Entrar com Google
        </button>
        <p v-if="googleEnabled && googleLoading" class="muted text-xs google-hint">Validando conta Google…</p>
        <div v-if="googleEnabled && googleOriginError" class="notice warning google-origin-hint">
          <Icon name="alert-triangle" :size="14" class="notice-icon" />
          <span>
            O Google bloqueou o botão nesta URL (<code>{{ appOrigin }}</code>). No
            <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer">Google Cloud → Credenciais OAuth</a>,
            abra o Client ID e adicione essa origem em «Origens JavaScript autorizadas». Use o botão abaixo ou login com senha.
          </span>
        </div>
        <p v-else-if="googleEnabled && isDev" class="muted text-xs google-origin-hint">
          Dev: autorize a origem <code>{{ appOrigin }}</code> no OAuth Client ID (Origens JavaScript).
        </p>

        <div class="form-footer contact-hint">
          <Icon name="info" :size="14" />
          <span>
            Não tem cadastro?
            <strong>Entre em contato com o RH ou administrador</strong> da sua empresa para solicitar acesso.
          </span>
        </div>

        <div class="demo-card">
          <div class="demo-header">
            <div>
              <strong>Contas de demonstração</strong>
              <span class="muted text-xs">Clique para preencher</span>
            </div>
            <button type="button" class="demo-toggle" @click="showDemo = !showDemo">
              <Icon :name="showDemo ? 'chevron-up' : 'chevron-down'" :size="14" />
            </button>
          </div>
          <div v-if="showDemo" class="demo-list">
            <button
              v-for="d in demos"
              :key="d.email"
              class="demo-item"
              type="button"
              @click="fillDemo(d)"
            >
              <span class="demo-role-badge" :style="{ background: d.color }">{{ d.short }}</span>
              <span class="demo-role">{{ d.role }}</span>
              <span class="demo-email">{{ d.email }}</span>
            </button>
            <p class="muted text-xs mt-2">Senha padrão: <code>123</code></p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, onActivated, onBeforeUnmount, nextTick } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuth } from '../auth'
import { useToast } from '../toast'
import { assertLoginForm } from '../services/formValidators'
import { HOME_ROUTE } from '../config/appRoutes.js'
import {
  isGoogleLoginEnabled,
  loadGoogleScript,
  renderGoogleSignInButton,
  promptGoogleSignIn,
  onGoogleSignInError
} from '../config/googleAuth.js'
import Icon from '../components/Icon.vue'

const router = useRouter()
const auth = useAuth()
const { showToast } = useToast()

const email = ref('')
const senha = ref('')
const loading = ref(false)
const googleLoading = ref(false)
const showPassword = ref(false)
const showDemo = ref(true)
const googleEnabled = isGoogleLoginEnabled()
const isDev = import.meta.env.DEV
const googleBtnRef = ref(null)
const showGoogleFallback = ref(false)
const googleOriginError = ref(false)
const appOrigin = ref(typeof window !== 'undefined' ? window.location.origin : '')
let gsiConsolePatched = false
let restoreConsoleError = null

const demos = [
  { role: 'RH / Admin', short: 'RH', email: 'sabrina.admin@empresa.com', color: 'linear-gradient(135deg, #6366f1, #4338ca)' },
  { role: 'Gestor', short: 'GE', email: 'gestor@empresa.com', color: 'linear-gradient(135deg, #0ea5e9, #0369a1)' },
  { role: 'Financeiro', short: 'FI', email: 'financeiro@empresa.com', color: 'linear-gradient(135deg, #f59e0b, #d97706)' },
  { role: 'Colaborador', short: 'CO', email: 'joao.silva@empresa.com', color: 'linear-gradient(135deg, #10b981, #059669)' }
]

const fillDemo = (d) => {
  email.value = d.email
  senha.value = '123'
}

function flagGoogleOriginMismatch() {
  googleOriginError.value = true
  showGoogleFallback.value = true
}

function watchGsiOriginErrors() {
  if (gsiConsolePatched || typeof window === 'undefined') return
  gsiConsolePatched = true
  const prev = console.error
  console.error = (...args) => {
    const text = args.map((a) => String(a)).join(' ')
    if (text.includes('origin is not allowed') || text.includes('GSI_LOGGER')) {
      flagGoogleOriginMismatch()
    }
    prev.apply(console, args)
  }
  restoreConsoleError = () => {
    console.error = prev
    gsiConsolePatched = false
  }
}

async function mountGoogleButton() {
  if (!googleEnabled) return
  showGoogleFallback.value = false
  googleOriginError.value = false
  watchGsiOriginErrors()
  onGoogleSignInError((err) => {
    const msg = String(err?.message || err?.type || '')
    if (msg.includes('origin') || err?.type === 'idpiframe_initialization_failed') {
      flagGoogleOriginMismatch()
    }
  })
  try {
    await loadGoogleScript()
    await nextTick()
    let ok = renderGoogleSignInButton(googleBtnRef.value, handleGoogleCredential)
    if (!ok) {
      for (let attempt = 0; attempt < 6 && !ok; attempt += 1) {
        await new Promise((r) => setTimeout(r, 80 * (attempt + 1)))
        await nextTick()
        ok = renderGoogleSignInButton(googleBtnRef.value, handleGoogleCredential)
      }
    }
    if (!ok) showGoogleFallback.value = true
    setTimeout(() => {
      const iframe = googleBtnRef.value?.querySelector('iframe')
      if (iframe && iframe.offsetHeight < 8) {
        flagGoogleOriginMismatch()
      }
    }, 2500)
  } catch (err) {
    showGoogleFallback.value = true
    console.warn('[google-auth]', err.message)
  }
}

const retryGoogleButton = async () => {
  await mountGoogleButton()
  if (showGoogleFallback.value) {
    try {
      await promptGoogleSignIn(handleGoogleCredential)
    } catch (err) {
      showToast(
        'Não foi possível abrir o Google. Confira as origens autorizadas no Google Cloud.',
        'error'
      )
      console.warn('[google-auth]', err.message)
    }
  }
}

onMounted(async () => {
  appOrigin.value = window.location.origin
  if (auth.isAuthenticated.value) {
    await router.replace(HOME_ROUTE)
    return
  }
  await mountGoogleButton()
})

onActivated(async () => {
  if (auth.isAuthenticated.value) {
    await router.replace(HOME_ROUTE)
    return
  }
  await mountGoogleButton()
})

onBeforeUnmount(() => {
  restoreConsoleError?.()
  restoreConsoleError = null
})

const handleGoogleCredential = async (credential) => {
  if (loading.value || googleLoading.value) return
  googleLoading.value = true
  try {
    await auth.loginWithGoogle(credential)
    showToast('Login com Google realizado!')
    router.push(HOME_ROUTE)
  } catch (err) {
    showToast(err.message, 'error')
  } finally {
    googleLoading.value = false
  }
}

const handleLogin = async () => {
  if (loading.value) return
  loading.value = true
  try {
    assertLoginForm(email.value, senha.value)
    await auth.login(email.value, senha.value)
    showToast('Login realizado com sucesso!')
    router.push(HOME_ROUTE)
  } catch (err) {
    showToast(err.message, 'error')
  } finally {
    loading.value = false
  }
}

</script>

<style scoped>
.login-wrapper {
  display: flex;
  min-height: 100vh;
  background: var(--bg-app);
}

.login-visual {
  flex: 1.15;
  background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  color: white;
  overflow: hidden;
}
@media (max-width: 1024px) { .login-visual { display: none; } }

.visual-content { position: relative; z-index: 2; max-width: 540px; }

.brand-row { display: flex; align-items: center; gap: 12px; margin-bottom: 3rem; }
.brand-row--link {
  text-decoration: none;
  color: inherit;
  border-radius: 12px;
  padding: 4px 6px;
  margin: -4px -6px 3rem;
  transition: opacity 0.2s ease;
}
.brand-row--link:hover { opacity: 0.92; }
.brand-mark {
  width: 42px; height: 42px;
  background: linear-gradient(135deg, #6366f1, #818cf8);
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 1rem;
  box-shadow: 0 12px 24px -8px rgba(99, 102, 241, 0.8);
}
.brand-text {
  font-weight: 700;
  font-size: 0.92rem;
  letter-spacing: 0.06em;
  opacity: 0.88;
  text-transform: uppercase;
}

.visual-content h1 {
  color: white;
  font-size: 2.55rem;
  line-height: 1.15;
  font-weight: 800;
  margin-bottom: 1rem;
  letter-spacing: -0.025em;
}
.visual-content > p {
  font-size: 1.05rem;
  color: rgba(255, 255, 255, 0.78);
  margin-bottom: 2.75rem;
  line-height: 1.55;
  max-width: 460px;
}

.features {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  list-style: none;
  padding: 0;
  margin: 0 0 2.5rem;
}
.feature {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  background: rgba(255, 255, 255, 0.06);
  padding: 0.95rem 1.1rem;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(4px);
}
.feature-icon {
  width: 36px; height: 36px;
  background: rgba(16, 185, 129, 0.18);
  color: #6ee7b7;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.feature strong { display: block; color: white; font-size: 0.92rem; margin-bottom: 3px; font-weight: 700; }
.feature span { color: rgba(255, 255, 255, 0.7); font-size: 0.82rem; line-height: 1.45; }

.visual-stats {
  display: flex;
  gap: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}
.visual-stats > div { display: flex; flex-direction: column; }
.visual-stats strong {
  color: white;
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.01em;
}
.visual-stats span {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-top: 2px;
}

.visual-bg {
  position: absolute; inset: 0;
  background-image: radial-gradient(rgba(255, 255, 255, 0.07) 1px, transparent 1px);
  background-size: 32px 32px;
  opacity: 0.5;
}
.visual-glow {
  position: absolute;
  width: 600px; height: 600px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.35) 0%, transparent 60%);
  top: -200px; right: -200px;
  pointer-events: none;
}

.login-form-side {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  background: var(--surface);
}
.form-container { width: 100%; max-width: 400px; }

.form-header { margin-bottom: 2rem; }
.form-header .badge { margin-bottom: 1rem; }
.form-header h2 { font-size: 1.85rem; margin: 0.4rem 0 0.4rem; }
.form-header .subtitle { margin: 0; }

.form-body { margin-bottom: 1.5rem; }

.google-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 1.25rem 0;
  color: var(--text-muted);
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.google-divider::before,
.google-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border-light);
}
.google-btn-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 0.5rem;
  min-height: 48px;
  width: 100%;
}
.google-fallback-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 0.5rem;
}
.google-hint { text-align: center; margin: 0 0 1rem; }
.google-origin-hint {
  margin: 0 0 1rem;
  padding: 0.5rem 0.65rem;
  background: var(--surface-soft);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  line-height: 1.45;
  font-size: 0.78rem;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
.google-origin-hint code { font-size: 0.72rem; word-break: break-all; }
.google-origin-hint a { color: var(--brand-primary); font-weight: 600; }

.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.label-row label { margin-bottom: 0; }
.forgot-link {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--brand-primary);
}

.input-wrap {
  position: relative;
}
.input-wrap input {
  padding-left: 2.5rem;
}
.input-icon {
  position: absolute;
  top: 50%;
  left: 12px;
  transform: translateY(-50%);
  color: var(--text-subtle);
  pointer-events: none;
}
.input-toggle {
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px;
  color: var(--text-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.input-toggle:hover { color: var(--text-strong); }

.form-footer.contact-hint {
  text-align: left;
  font-size: 0.82rem;
  color: var(--text-muted);
  margin-bottom: 1.5rem;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 0.75rem 0.85rem;
  background: var(--surface-soft);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  line-height: 1.45;
}
.form-footer.contact-hint strong {
  color: var(--text-strong);
  font-weight: 600;
}

.demo-card {
  background: var(--surface-soft);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  padding: 0.85rem 1rem;
  font-size: var(--text-sm);
}
.demo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}
.demo-header > div { display: flex; flex-direction: column; gap: 2px; }
.demo-header strong { font-size: 0.85rem; color: var(--text-strong); }
.demo-toggle {
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-xs);
  width: 28px; height: 28px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  transition: var(--transition);
}
.demo-toggle:hover { color: var(--text-strong); border-color: var(--border-strong); }

.demo-list { margin-top: 0.7rem; display: flex; flex-direction: column; gap: 4px; }
.demo-item {
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-xs);
  padding: 0.5rem 0.7rem;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: var(--transition);
  font-family: inherit;
}
.demo-item:hover {
  background: var(--brand-primary-softer);
  border-color: var(--brand-primary);
  transform: translateX(2px);
}
.demo-role-badge {
  width: 28px; height: 28px;
  border-radius: var(--radius-xs);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 800;
  font-size: 0.65rem;
  letter-spacing: 0.04em;
  flex-shrink: 0;
}
.demo-role { font-weight: 700; color: var(--text-strong); font-size: 0.78rem; flex-shrink: 0; }
.demo-email { color: var(--text-muted); font-size: 0.72rem; font-family: var(--font-mono); flex: 1; text-align: right; }
</style>
