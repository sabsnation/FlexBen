<template>
  <div class="auth-page">
    <div class="auth-card">
      <RouterLink to="/login" class="auth-back">
        <Icon name="arrow-left" :size="14" />
        Voltar ao login
      </RouterLink>

      <span class="badge badge-primary">Novo cadastro</span>
      <h1>Criar conta de colaborador</h1>
      <p class="subtitle">
        Cadastro disponível para colaboradores. Perfis de gestor, RH ou financeiro são criados pela administração.
      </p>

      <form class="form-body" @submit.prevent="handleRegister">
        <div class="form-group">
          <label>Nome completo <span class="req">*</span></label>
          <div class="input-wrap">
            <Icon name="user" :size="16" class="input-icon" />
            <input type="text" placeholder="Nome e sobrenome" v-model="form.nome" />
          </div>
        </div>

        <div class="form-group">
          <label>E-mail corporativo <span class="req">*</span></label>
          <div class="input-wrap">
            <Icon name="mail" :size="16" class="input-icon" />
            <input type="email" placeholder="nome@empresa.com" v-model="form.email" />
          </div>
        </div>

        <div class="form-group">
          <label>Senha <span class="req">*</span></label>
          <div class="input-wrap">
            <Icon name="lock" :size="16" class="input-icon" />
            <input type="password" placeholder="Mínimo 6 caracteres" v-model="form.senha" />
          </div>
          <p class="field-help">Use uma senha exclusiva. Não reutilize a do e-mail corporativo.</p>
        </div>

        <p v-if="fieldError" class="field-error">
          <Icon name="alert-circle" :size="14" />
          {{ fieldError }}
        </p>

        <button class="btn btn-primary btn-lg btn-block" type="submit" :disabled="loading">
          <Icon v-if="loading" name="spinner" :size="16" class="spin" />
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
import Icon from '../components/Icon.vue'

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
  background: linear-gradient(135deg, #f6f7fb 0%, #eef2ff 50%, #e0e7ff 100%);
  position: relative;
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
