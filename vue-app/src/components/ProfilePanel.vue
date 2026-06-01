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
          {{ uploadingImage ? 'Processando…' : 'Enviar foto' }}
          <input
            ref="fileInput"
            type="file"
            class="file-input"
            accept="image/*"
            capture="user"
            @change="onFile"
          />
        </label>
        <p class="upload-hint muted text-xs">
          Fotos da câmera são comprimidas automaticamente (até 8 MB, ~800 KB após ajuste).
        </p>
        <button
          v-if="avatarPreview || user?.hasAvatar"
          type="button"
          class="btn btn-ghost btn-sm"
          :disabled="uploadingImage"
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
      <button type="button" class="btn btn-primary" :disabled="saving || uploadingImage" @click="save">
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
import {
  resizeImageForAvatar,
  MAX_AVATAR_FILE_BYTES
} from '../services/imageResize.js'
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
const uploadingImage = ref(false)
const fileInput = ref(null)
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

async function loadAvatarPreview() {
  if (user.value?.avatarData) {
    avatarPreview.value = user.value.avatarData
    return
  }
  if (!user.value?.hasAvatar) {
    avatarPreview.value = ''
    return
  }
  try {
    await auth.refreshMe()
    avatarPreview.value = auth.user.value?.avatarData || ''
  } catch {
    avatarPreview.value = ''
  }
}

watch(
  () => props.open,
  async (isOpen) => {
    if (!isOpen) return
    nome.value = user.value?.nome || ''
    avatarDirty.value = false
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    await loadAvatarPreview()
  }
)

const onFile = async (e) => {
  const file = e.target.files?.[0]
  if (e.target) e.target.value = ''
  if (!file) return

  if (file.size > MAX_AVATAR_FILE_BYTES) {
    showToast('Arquivo muito grande. O limite é 8 MB por foto.', 'error')
    return
  }

  uploadingImage.value = true
  try {
    const dataUrl = await resizeImageForAvatar(file)
    avatarPreview.value = dataUrl
    avatarDirty.value = true
    showToast('Foto pronta. Clique em Salvar para confirmar.')
  } catch (err) {
    showToast(err.message || 'Não foi possível usar esta imagem.', 'error')
  } finally {
    uploadingImage.value = false
  }
}

const clearAvatar = () => {
  avatarPreview.value = ''
  avatarDirty.value = true
  if (fileInput.value) fileInput.value.value = ''
}

const save = async () => {
  if (saving.value || uploadingImage.value) return
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
  position: relative;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
}
.file-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  font-size: 0;
}
.upload-hint {
  text-align: center;
  max-width: 280px;
  line-height: 1.4;
  margin: 0;
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
