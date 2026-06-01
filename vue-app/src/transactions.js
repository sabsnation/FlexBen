import { reactive, computed } from 'vue'
import { useAuth } from './auth'
import { transactionRepository } from './repositories/TransactionApiRepository.js'

const state = reactive({
  items: [],
  balancesByCategory: {}
})

export const useTransactions = () => {
  const auth = useAuth()

  const loadMine = async () => {
    const transactions = await transactionRepository.list()
    state.items = transactions
    return transactions
  }

  const loadMyBalances = async () => {
    const balances = await transactionRepository.getMyBalances()
    const map = {}
    for (const row of balances) {
      map[row.categoria] = {
        saldo: Number(row.saldo) || 0,
        limite: Number(row.limite) || 0
      }
    }
    state.balancesByCategory = map
    return balances
  }

  const categoryBalance = (categoria) => {
    const key = String(categoria || '').trim()
    return state.balancesByCategory[key]?.saldo ?? 0
  }

  const categoryLimit = (categoria) => {
    const key = String(categoria || '').trim()
    return state.balancesByCategory[key]?.limite ?? 0
  }

  const myTransactions = computed(() => {
    const email = auth.user.value?.email?.toLowerCase()
    if (!email) return []
    return state.items.filter((t) => t.userEmail === email)
  })

  const createReallocation = async (payload) => {
    await transactionRepository.createReallocation(payload)
    await Promise.all([loadMine(), loadMyBalances()])
  }

  const registerUsage = async (payload) => {
    await transactionRepository.registerUsage(payload)
    await Promise.all([loadMine(), loadMyBalances()])
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
    balancesByCategory: computed(() => state.balancesByCategory),
    loadMine,
    loadMyBalances,
    categoryBalance,
    categoryLimit,
    createReallocation,
    registerUsage,
    deleteTransaction,
    getWorkflowHistory,
    totalBalance,
    applyMonthlyCategoryCredits
  }
}
