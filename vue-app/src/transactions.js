import { reactive, computed } from 'vue'
import { useAuth } from './auth'
import { transactionRepository } from './repositories/TransactionApiRepository.js'

const state = reactive({
  items: []
})

export const useTransactions = () => {
  const auth = useAuth()

  const loadMine = async () => {
    const transactions = await transactionRepository.list()
    state.items = transactions
    return transactions
  }

  const myTransactions = computed(() => {
    const email = auth.user.value?.email?.toLowerCase()
    if (!email) return []
    return state.items.filter((t) => t.userEmail === email)
  })

  const createReallocation = async (payload) => {
    await transactionRepository.createReallocation(payload)
    await loadMine()
  }

  const registerUsage = async (payload) => {
    await transactionRepository.registerUsage(payload)
    await loadMine()
  }

  const deleteTransaction = async (id) => {
    await transactionRepository.remove(id)
    state.items = state.items.filter((item) => item.id !== id)
  }

  const getWorkflowHistory = async (id) => {
    return transactionRepository.getWorkflowEvents(id)
  }

  const totalBalance = computed(() => {
    return myTransactions.value.reduce((acc, item) => {
      return item.tipo === 'Entrada' ? acc + item.valor : acc - item.valor
    }, 0)
  })

  const applyMonthlyCategoryCredits = async () => {
    return transactionRepository.runMonthlyLoad()
  }

  return {
    transactions: myTransactions,
    allTransactions: computed(() => state.items),
    loadMine,
    createReallocation,
    registerUsage,
    deleteTransaction,
    getWorkflowHistory,
    totalBalance,
    applyMonthlyCategoryCredits
  }
}
