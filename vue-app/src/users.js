import { computed } from 'vue'
import { useAuth } from './auth'
import { userRepository } from './repositories/UserApiRepository.js'

/**
 * Camada de aplicação: gestão administrativa de usuários.
 */
export const useUsers = () => {
  const auth = useAuth()

  const users = computed(() =>
    auth.allRegisteredUsers.value.map((u) => ({
      ...u,
      data: u.dataCadastro
    }))
  )

  const inviteUser = async (payload) => {
    const user = await userRepository.invite(payload)
    await auth.loadUsers()
    return user
  }

  return {
    users,
    loadUsers: auth.loadUsers,
    toggleStatus: auth.setRegisteredUserStatus,
    deleteUser: auth.removeRegisteredUser,
    inviteUser
  }
}
