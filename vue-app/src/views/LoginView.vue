<template>
  <div class="login-wrapper">
    <div class="login-visual">
      <div class="visual-content">
        <div class="brand-row">
          <div class="brand-mark">CB</div>
          <span class="brand-text">CorpBenefit Flex 2026</span>
        </div>
        <h1>Gestão corporativa de benefícios flexíveis com governança real.</h1>
        <p>Plataforma única para colaboradores, gestores, RH e financeiro — com políticas, aprovações e fechamento auditável.</p>

        <div class="features">
          <div class="feature">
            <span class="feature-icon">⇄</span>
            <div>
              <strong>Realocação flex</strong>
              <span>Mova créditos entre categorias respeitando políticas e tetos.</span>
            </div>
          </div>
          <div class="feature">
            <span class="feature-icon">✓</span>
            <div>
              <strong>Aprovação gerencial</strong>
              <span>Fila com SLA, justificativa e trilha auditável de cada decisão.</span>
            </div>
          </div>
          <div class="feature">
            <span class="feature-icon">$</span>
            <div>
              <strong>Fechamento financeiro</strong>
              <span>Consolidação mensal, previsto x realizado e exportação CSV.</span>
            </div>
          </div>
        </div>
      </div>
      <div class="visual-bg"></div>
    </div>

    <div class="login-form-side">
      <div class="form-container">
        <div class="form-header">
          <h2>Acesse sua conta</h2>
          <p class="subtitle">Use seu e-mail corporativo. O perfil é definido pelo cadastro RH.</p>
        </div>

        <form class="form-body" @submit.prevent="handleLogin">
          <div class="form-group">
            <label>E-mail corporativo</label>
            <input type="email" placeholder="nome@empresa.com" v-model="email" autocomplete="username" />
          </div>
          <div class="form-group">
            <label>Senha</label>
            <input type="password" placeholder="••••••••" v-model="senha" autocomplete="current-password" />
          </div>

          <button class="btn btn-primary btn-lg btn-block" :disabled="loading" type="submit">
            <span v-if="!loading">Entrar</span>
            <span v-else>Entrando…</span>
          </button>
        </form>

        <div class="form-footer">
          <RouterLink class="link" to="/cadastro">Criar conta</RouterLink>
          <span class="divider">·</span>
          <RouterLink class="link" to="/recuperar-senha">Esqueci minha senha</RouterLink>
        </div>

        <div class="demo-card">
          <div class="demo-header">
            <strong>Contas de demonstração</strong>
            <button type="button" class="demo-toggle" @click="showDemo = !showDemo">
              {{ showDemo ? 'Ocultar' : 'Mostrar' }}
            </button>
          </div>
          <div v-if="showDemo" class="demo-list">
            <button v-for="d in demos" :key="d.email" class="demo-item" type="button" @click="fillDemo(d)">
              <span class="demo-role">{{ d.role }}</span>
              <span class="demo-email">{{ d.email }}</span>
            </button>
            <p class="muted" style="font-size: 0.75rem; margin-top: 0.5rem;">Senha padrão: <code>123</code></p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../auth'
import { useToast } from '../toast'
import { assertLoginForm } from '../services/formValidators'

const router = useRouter()
const auth = useAuth()
const { showToast } = useToast()

const email = ref('')
const senha = ref('')
const loading = ref(false)
const showDemo = ref(true)

const demos = [
  { role: 'RH / Admin', email: 'sabrina.admin@empresa.com' },
  { role: 'Gestor', email: 'gestor@empresa.com' },
  { role: 'Financeiro', email: 'financeiro@empresa.com' },
  { role: 'Colaborador', email: 'joao.silva@empresa.com' }
]

const fillDemo = (d) => {
  email.value = d.email
  senha.value = '123'
}

const handleLogin = async () => {
  if (loading.value) return
  loading.value = true
  try {
    assertLoginForm(email.value, senha.value)
    await auth.login(email.value, senha.value)
    showToast('Login realizado com sucesso!')
    router.push(landingForRole(auth.role.value))
  } catch (err) {
    showToast(err.message, 'error')
  } finally {
    loading.value = false
  }
}

function landingForRole(role) {
  if (role === 'gestor') return '/gestor/aprovacoes'
  if (role === 'financeiro') return '/financeiro/fechamento'
  if (role === 'administrador') return '/rh/politicas'
  return '/dashboard'
}
</script>

<style scoped>
.login-wrapper { display: flex; min-height: 100vh; background: white; }

.login-visual {
  flex: 1.2;
  background: linear-gradient(135deg, #4338ca 0%, #1e1b4b 100%);
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

.brand-row { display: flex; align-items: center; gap: 12px; margin-bottom: 2.5rem; }
.brand-mark {
  width: 40px; height: 40px;
  background: linear-gradient(135deg, #6366f1, #818cf8);
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 1rem;
  box-shadow: 0 8px 16px -8px rgba(99, 102, 241, 0.8);
}
.brand-text { font-weight: 700; font-size: 0.95rem; letter-spacing: 0.04em; opacity: 0.85; }

.visual-content h1 {
  color: white;
  font-size: 2.4rem;
  line-height: 1.15;
  margin-bottom: 1rem;
  letter-spacing: -0.02em;
}
.visual-content > p {
  font-size: 1.05rem;
  color: rgba(255, 255, 255, 0.78);
  margin-bottom: 2.5rem;
  line-height: 1.55;
}

.features { display: flex; flex-direction: column; gap: 1rem; }
.feature {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  background: rgba(255, 255, 255, 0.06);
  padding: 0.9rem 1rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.feature-icon {
  width: 32px; height: 32px;
  background: rgba(16, 185, 129, 0.18);
  color: #6ee7b7;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;
}
.feature strong { display: block; color: white; font-size: 0.9rem; margin-bottom: 2px; }
.feature span { color: rgba(255, 255, 255, 0.7); font-size: 0.82rem; line-height: 1.4; }

.visual-bg {
  position: absolute; inset: 0;
  background-image: radial-gradient(rgba(255, 255, 255, 0.07) 1px, transparent 1px);
  background-size: 32px 32px;
  opacity: 0.6;
}

.login-form-side {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2.5rem 2rem;
  background: white;
}
.form-container { width: 100%; max-width: 380px; }

.form-header { margin-bottom: 1.75rem; }
.form-header h2 { font-size: 1.6rem; margin-bottom: 0.35rem; }

.form-body { margin-bottom: 1.5rem; }

.form-footer {
  text-align: center;
  font-size: 0.85rem;
  color: var(--text-muted);
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-bottom: 1.5rem;
}
.form-footer .divider { color: var(--border-strong); }

.demo-card {
  background: var(--surface-soft);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  padding: 0.85rem 1rem;
  font-size: 0.8rem;
}
.demo-header { display: flex; justify-content: space-between; align-items: center; }
.demo-toggle {
  background: none;
  border: none;
  color: var(--brand-primary);
  font-weight: 700;
  cursor: pointer;
  font-size: 0.78rem;
}
.demo-list { margin-top: 0.6rem; display: flex; flex-direction: column; gap: 4px; }
.demo-item {
  background: white;
  border: 1px solid var(--border-light);
  border-radius: 6px;
  padding: 0.45rem 0.6rem;
  text-align: left;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  transition: var(--transition);
}
.demo-item:hover { background: var(--brand-primary-soft); border-color: var(--brand-primary); }
.demo-role { font-weight: 700; color: var(--text-strong); font-size: 0.78rem; }
.demo-email { color: var(--text-muted); font-size: 0.75rem; font-family: ui-monospace, monospace; }
</style>
