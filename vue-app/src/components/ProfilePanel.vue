<template>
  <Modal :open="open" title="Meu perfil" max-width="480px" @close="emit('close')">
    <div class="profile-layout">
      <div class="avatar-block">
        <div class="avatar avatar-lg" :style="avatarStyle">
          <img v-if="avatarPreview" :src="avatarPreview" alt="" class="avatar-img" />
          <span v-else>{{ initials }}</span>
        </div>
        <label class="btn btn-secondary btn-sm upload-btn">
          <Icon name="upload" :size="14" />
          Enviar foto
          <input type="file" accept="image/jpeg,image/png,image/webp" hidden @change="onFile" />
        </label>
        <button
          v-if="avatarPreview || user?.hasAvatar"
          type="button"
          class="btn btn-ghost btn-sm"
          @click="clearAvatar"
        >
          Remover foto
        </button>
      </div>

      <div class="form-group">
        <label>Nome</label>
        <input v-model="nome" type="text" autocomplete="name" />
      </div>
      <div class="form-group">
        <label>E-mail</label>
        <input :value="user?.email" type="email" disabled />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Perfil</label>
          <input :value="roleLabel" type="text" disabled />
        </div>
        <div class="form-group">
          <label>Status</label>
          <input :value="user?.status || '—'" type="text" disabled />
        </div>
      </div>
      <div class="form-group">
        <label>Membro desde</label>
        <input :value="user?.dataCadastro || '—'" type="text" disabled />
      </div>

      <hr class="divider" />

      <h4 class="section-label">Alterar senha</h4>
      <div class="form-group">
        <label>Senha atual</label>
        <input v-model="currentPassword" type="password" autocomplete="current-password" />
      </div>
      <div class="form-group">
        <label>Nova senha</label>
        <input v-model="newPassword" type="password" autocomplete="new-password" />
      </div>
      <div class="form-group">
        <label>Confirmar nova senha</label>
        <input v-model="confirmPassword" type="password" autocomplete="new-password" />
      </div>
    </div>

    <template #footer>
      <button type="button" class="btn btn-ghost" @click="emit('close')">Cancelar</button>
      <button type="button" class="btn btn-primary" :disabled="saving" @click="save">
        <Icon v-if="saving" name="spinner" :size="14" class="spin" />
        <span v-else>Salvar alterações</span>
      </button>
    </template>
  </Modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useAuth } from '../auth.js'
import { useToast } from '../toast.js'
import Modal from './Modal.vue'
import Icon from './Icon.vue'

const props = defineProps({
  open: { type: Boolean, default: false }
})
const emit = defineEmits(['close'])

const auth = useAuth()
const { showToast } = useToast()

const nome = ref('')
const avatarPreview = ref('')
const avatarDirty = ref(false)
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const saving = ref(false)

const user = computed(() => auth.user.value)

const roleLabel = computed(() => {
  const map = {
    colaborador: 'Colaborador',
    gestor: 'Gestor',
    administrador: 'RH / Admin',
    financeiro: 'Financeiro'
  }
  return map[user.value?.role] || user.value?.role || ''
})

const initials = computed(() => {
  const u = user.value
  if (!u) return '?'
  if (u.initials) return u.initials
  return (u.nome || '?').slice(0, 2).toUpperCase()
})

const avatarStyle = computed(() => {
  if (avatarPreview.value) return {}
  return { background: 'linear-gradient(135deg, #6366f1, #4338ca)' }
})

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    nome.value = user.value?.nome || ''
    avatarPreview.value = user.value?.avatarData || ''
    avatarDirty.value = false
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  }
)

const onFile = (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.size > 400_000) {
    showToast('Imagem muito grande. Use até ~400 KB.', 'error')
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    avatarPreview.value = reader.result
    avatarDirty.value = true
  }
  reader.readAsDataURL(file)
  e.target.value = ''
}

const clearAvatar = () => {
  avatarPreview.value = ''
  avatarDirty.value = true
}

const save = async () => {
  if (saving.value) return
  const trimmed = nome.value.trim()
  if (trimmed.length < 2) {
    showToast('Informe um nome válido.', 'error')
    return
  }

  const wantsPassword =
    currentPassword.value || newPassword.value || confirmPassword.value

  if (wantsPassword) {
    if (!currentPassword.value || !newPassword.value) {
      showToast('Preencha senha atual e nova senha.', 'error')
      return
    }
    if (newPassword.value !== confirmPassword.value) {
      showToast('A confirmação da senha não confere.', 'error')
      return
    }
    if (newPassword.value.length < 6) {
      showToast('A nova senha deve ter ao menos 6 caracteres.', 'error')
      return
    }
  }

  saving.value = true
  try {
    const profilePayload = { nome: trimmed }
    if (avatarDirty.value) {
      profilePayload.avatarData = avatarPreview.value || ''
    }
    await auth.updateProfile(profilePayload)

    if (wantsPassword) {
      await auth.changePassword(currentPassword.value, newPassword.value)
      currentPassword.value = ''
      newPassword.value = ''
      confirmPassword.value = ''
    }

    showToast('Perfil atualizado com sucesso.')
    emit('close')
  } catch (err) {
    showToast(err.message || 'Não foi possível salvar.', 'error')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.profile-layout {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}
.avatar-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}
.avatar-lg {
  width: 88px;
  height: 88px;
  font-size: 1.5rem;
  overflow: hidden;
}
.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.upload-btn {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.divider {
  border: none;
  border-top: 1px solid var(--border-light);
  margin: 0.5rem 0;
}
.section-label {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-strong);
}
</style>
