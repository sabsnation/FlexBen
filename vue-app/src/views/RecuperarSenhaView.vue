<template>
  <div class="auth-page">
    <div class="auth-card">
      <RouterLink to="/login" class="auth-back">
        <Icon name="arrow-left" :size="14" />
        Voltar ao login
      </RouterLink>

      <span class="badge badge-primary">Recuperação</span>
      <h1>Recuperar senha</h1>
      <p class="subtitle">
        Informe seu e-mail corporativo e enviaremos as instruções de redefinição (envio simulado em homologação).
      </p>

      <form class="form-body" @submit.prevent="submit">
        <div class="form-group">
          <label>E-mail corporativo <span class="req">*</span></label>
          <div class="input-wrap">
            <Icon name="mail" :size="16" class="input-icon" />
            <input v-model="email" type="email" placeholder="nome@empresa.com" autocomplete="email" />
          </div>
        </div>

        <p v-if="errorMsg" class="field-error">
          <Icon name="alert-circle" :size="14" />
          {{ errorMsg }}
        </p>

        <button class="btn btn-primary btn-lg btn-block" type="submit" :disabled="loading">
          <Icon v-if="loading" name="spinner" :size="16" class="spin" />
          <span v-if="!loading">Enviar link de recuperação</span>
          <span v-else>Enviando…</span>
        </button>
      </form>

      <div class="auth-footer">
        Lembrou a senha?
        <RouterLink class="link" to="/login">Fazer login</RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuth } from '../auth'
import { useToast } from '../toast'
import { assertRecoverPasswordForm } from '../services/formValidators'
import Icon from '../components/Icon.vue'

const email = ref('')
const errorMsg = ref('')
const loading = ref(false)
const auth = useAuth()
const { showToast } = useToast()

const submit = async () => {
  if (loading.value) return
  errorMsg.value = ''
  try {
    assertRecoverPasswordForm(email.value)
  } catch (err) {
    errorMsg.value = err.message
    showToast(err.message, 'error')
    return
  }
  loading.value = true
  try {
    const res = await auth.recoverPassword(email.value.trim())
    showToast(res.message || 'Solicitação registrada.', 'info')
    email.value = ''
  } catch (err) {
    errorMsg.value = err.message
    showToast(err.message, 'error')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  background: linear-gradient(135deg, #f6f7fb 0%, #eef2ff 50%, #e0e7ff 100%);
}
.auth-page::before {
  content: '';
  position: absolute; inset: 0;
  background-image: radial-gradient(rgba(99, 102, 241, 0.08) 1px, transparent 1px);
  background-size: 28px 28px;
  pointer-events: none;
}
.auth-card {
  width: 100%;
  max-width: 460px;
  background: var(--surface);
  border-radius: var(--radius-lg);
  padding: 2.5rem 2.25rem;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border-light);
  position: relative;
}
.auth-back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-sm);
  color: var(--text-muted);
  margin-bottom: 1.25rem;
  font-weight: 600;
  transition: var(--transition);
}
.auth-back:hover { color: var(--brand-primary); text-decoration: none; transform: translateX(-2px); }
.auth-card .badge { margin-bottom: 1rem; }
.auth-card h1 { margin-bottom: 0.4rem; font-size: 1.65rem; }
.form-body { margin-top: 1.75rem; }
.auth-footer {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-subtle);
  text-align: center;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.input-wrap { position: relative; }
.input-wrap input { padding-left: 2.5rem; }
.input-icon {
  position: absolute;
  top: 50%;
  left: 12px;
  transform: translateY(-50%);
  color: var(--text-subtle);
  pointer-events: none;
}
</style>
