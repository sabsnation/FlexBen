import { reactive, computed } from 'vue'
import { creditAllocationRepository } from './repositories/CreditAllocationApiRepository.js'

const state = reactive({
  eligibleUsers: [],
  selectedUser: null,
  balances: []
})

export const useCredits = () => {
  const loadEligibleUsers = async () => {
    const users = await creditAllocationRepository.listEligibleUsers()
    state.eligibleUsers = users
    return users
  }

  const loadUserBalances = async (userId) => {
    const { user, balances } = await creditAllocationRepository.getUserBalances(userId)
    state.selectedUser = user
    state.balances = balances
    return { user, balances }
  }

  const allocateCredits = async (userId, items) => {
    return creditAllocationRepository.allocate({ userId, items })
  }

  const clearSelection = () => {
    state.selectedUser = null
    state.balances = []
  }

  return {
    eligibleUsers: computed(() => state.eligibleUsers),
    selectedUser: computed(() => state.selectedUser),
    balances: computed(() => state.balances),
    loadEligibleUsers,
    loadUserBalances,
    allocateCredits,
    clearSelection
  }
}
