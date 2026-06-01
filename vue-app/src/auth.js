import { reactive, computed } from 'vue'
import { httpApiClient } from './adapters/HttpApiClient.js'
import { authRepository } from './repositories/AuthApiRepository.js'
import { userRepository } from './repositories/UserApiRepository.js'
import { roleCan } from './config/capabilities'

const state = reactive({
  user: JSON.parse(localStorage.getItem('user')) || null,
  registeredUsers: []
})

/** Avatar em base64 não vai ao localStorage (estoura cota no mobile). */
function persistUserSession(user) {
  state.user = user
  if (!user) {
    localStorage.removeItem('user')
    return
  }
  const { avatarData: _drop, ...lite } = user
  const payload = {
    ...lite,
    hasAvatar: Boolean(user.hasAvatar || user.avatarData)
  }
  try {
    localStorage.setItem('user', JSON.stringify(payload))
  } catch {
    try {
      localStorage.setItem(
        'user',
        JSON.stringify({
          id: user.id,
          email: user.email,
          role: user.role,
          nome: user.nome,
          hasAvatar: payload.hasAvatar
        })
      )
    } catch {
      /* sessão segue em memória */
    }
  }
}

export const useAuth = () => {
  const refreshMe = async () => {
    const { user } = await authRepository.me()
    persistUserSession(user)
    return user
  }

  const login = async (email, senha) => {
    const { token, user } = await authRepository.login(email, senha)
    httpApiClient.setToken(token)
    persistUserSession(user)
    return user
  }

  const register = async (userData) => {
    await authRepository.register(userData)
  }

  const logout = () => {
    persistUserSession(null)
    httpApiClient.clearToken()
  }

  const role = computed(() => state.user?.role || '')
  const isAdmin = computed(() => role.value === 'administrador')
  const isManager = computed(() => role.value === 'gestor')
  const isFinance = computed(() => role.value === 'financeiro')
  const hasAnyRole = (roles = []) => roles.includes(role.value)
  const can = (capability) => roleCan(role.value, capability)

  const allRegisteredUsers = computed(() => state.registeredUsers)

  const loadUsers = async () => {
    const users = await userRepository.list()
    state.registeredUsers = users
    return users
  }

  const findRegisteredUserByEmail = async (email) => {
    if (!state.registeredUsers.length && isAdmin.value) {
      await loadUsers()
    }
    const key = email.trim().toLowerCase()
    return state.registeredUsers.find((u) => u.email === key) || null
  }

  const setRegisteredUserStatus = async (id) => {
    const user = await userRepository.toggleStatus(id)
    state.registeredUsers = state.registeredUsers.map((u) => (u.id === id ? user : u))
    return user
  }

  const removeRegisteredUser = async (id) => {
    await userRepository.remove(id)
    state.registeredUsers = state.registeredUsers.filter((u) => u.id !== id)
  }

  const recoverPassword = async (email) => {
    return authRepository.recoverPassword(email)
  }

  const updateProfile = async (payload) => {
    const { user } = await authRepository.updateProfile(payload)
    persistUserSession(user)
    return user
  }

  const changePassword = async (currentPassword, newPassword) => {
    return authRepository.changePassword(currentPassword, newPassword)
  }

  return {
    user: computed(() => state.user),
    role,
    isAuthenticated: computed(() => !!state.user),
    isAdmin,
    isManager,
    isFinance,
    hasAnyRole,
    can,
    allRegisteredUsers,
    findRegisteredUserByEmail,
    setRegisteredUserStatus,
    removeRegisteredUser,
    loadUsers,
    refreshMe,
    recoverPassword,
    login,
    logout,
    register,
    updateProfile,
    changePassword
  }
}
