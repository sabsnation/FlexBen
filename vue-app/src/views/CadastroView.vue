<template>
  <div class="auth-page">
    <div class="auth-card">
      <RouterLink to="/login" class="auth-back">← Voltar ao login</RouterLink>
      <h1>Criar conta de colaborador</h1>
      <p class="subtitle">
        Cadastro disponível para colaboradores. Perfis de gestor, RH ou financeiro são criados pela administração.
      </p>

      <form class="form-body" @submit.prevent="handleRegister">
        <div class="form-group">
          <label>Nome completo <span class="req">*</span></label>
          <input type="text" placeholder="Nome e sobrenome" v-model="form.nome" />
        </div>
        <div class="form-group">
          <label>E-mail corporativo <span class="req">*</span></label>
          <input type="email" placeholder="nome@empresa.com" v-model="form.email" />
        </div>
        <div class="form-group">
          <label>Senha <span class="req">*</span></label>
          <input type="password" placeholder="Mínimo 6 caracteres" v-model="form.senha" />
          <p class="field-help">Use uma senha exclusiva, não reutilize a do e-mail corporativo.</p>
        </div>

        <p v-if="fieldError" class="field-error">{{ fieldError }}</p>

        <button class="btn btn-primary btn-lg btn-block" type="submit" :disabled="loading">
          <span v-if="!loading">Finalizar cadastro</span>
          <span v-else>Cadastrando…</span>
        </button>
      </form>

      <div class="auth-footer">
        Já possui uma conta?
        <RouterLink class="link" to="/login">Fazer login</RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../auth'
import { useToast } from '../toast'
import { assertCadastroForm } from '../services/formValidators'

const router = useRouter()
const auth = useAuth()
const { showToast } = useToast()

const form = reactive({ nome: '', email: '', senha: '' })
const fieldError = ref('')
const loading = ref(false)

const handleRegister = async () => {
  if (loading.value) return
  fieldError.value = ''
  loading.value = true
  const nome = form.nome.trim()
  try {
    assertCadastroForm({ nome, email: form.email, senha: form.senha })
    await auth.register({ nome, email: form.email.trim(), senha: form.senha })
    showToast('Conta criada com sucesso! Agora faça login.')
    router.push('/login')
  } catch (err) {
    fieldError.value = err.message
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
  position: relative;
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
