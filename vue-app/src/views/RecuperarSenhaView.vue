<template>
  <div class="auth-page">
    <div class="auth-card">
      <RouterLink to="/login" class="auth-back">← Voltar ao login</RouterLink>
      <h1>Recuperar senha</h1>
      <p class="subtitle">
        Informe seu e-mail corporativo e enviaremos as instruções de redefinição (envio simulado em homologação).
      </p>

      <form class="form-body" @submit.prevent="submit">
        <div class="form-group">
          <label>E-mail corporativo <span class="req">*</span></label>
          <input v-model="email" type="email" placeholder="nome@empresa.com" autocomplete="email" />
        </div>
        <p v-if="errorMsg" class="field-error">{{ errorMsg }}</p>
        <button class="btn btn-primary btn-lg btn-block" type="submit" :disabled="loading">
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
  background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
}
.auth-card {
  width: 100%;
  max-width: 460px;
  background: white;
  border-radius: var(--radius-lg);
  padding: 2.5rem 2.25rem;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border-light);
}
.auth-back {
  display: inline-block;
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: 1.25rem;
  font-weight: 600;
}
.auth-back:hover { color: var(--brand-primary); text-decoration: underline; }
.form-body { margin-top: 1.5rem; }
.auth-footer {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-light);
  text-align: center;
  font-size: 0.9rem;
  color: var(--text-muted);
}
</style>
