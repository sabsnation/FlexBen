import { reactive, computed } from 'vue'
import { useAuth } from './auth'
import { transactionRepository } from './repositories/TransactionApiRepository.js'
import { balanceForCategory } from './services/transactionService.js'

const state = reactive({
  items: [],
  balancesByCategory: {},
  /** 'mine' | 'all' — último carregamento de /transactions */
  listScope: 'mine'
})

export const useTransactions = () => {
  const auth = useAuth()

  const applyBalances = (balances) => {
    const map = {}
    for (const row of balances || []) {
      map[row.categoria] = {
        saldo: Number(row.saldo) || 0,
        limite: Number(row.limite) || 0
      }
    }
    state.balancesByCategory = map
    return map
  }

  const rebuildBalancesFromTransactions = () => {
    const email = auth.user.value?.email || ''
    const cats = new Set(state.items.map((t) => t.categoria).filter(Boolean))
    const map = {}
    for (const categoria of cats) {
      map[categoria] = {
        saldo: balanceForCategory(state.items, email, categoria),
        limite: state.balancesByCategory[categoria]?.limite || 0
      }
    }
    state.balancesByCategory = { ...state.balancesByCategory, ...map }
    return map
  }

  const normalizeListPayload = (data) => {
    if (!data) {
      return { transactions: [], balances: [] }
    }
    if (Array.isArray(data)) {
      return { transactions: data, balances: [] }
    }
    return {
      transactions: data.transactions || [],
      balances: data.balances || []
    }
  }

  const loadMine = async ({ scope } = {}) => {
    const effectiveScope =
      scope ?? (auth.isAdmin.value ? 'all' : undefined)
    const data = await transactionRepository.list({
      scope: effectiveScope === 'all' ? 'all' : undefined
    })
    const { transactions, balances } = normalizeListPayload(data)
    state.items = transactions
    state.listScope = effectiveScope === 'all' ? 'all' : 'mine'
    if (Array.isArray(balances) && balances.length) {
      applyBalances(balances)
    } else {
      rebuildBalancesFromTransactions()
    }
    return state.items
  }

  const loadMyBalances = async () => {
    try {
      const balances = await transactionRepository.getMyBalances()
      applyBalances(balances)
      return balances
    } catch {
      rebuildBalancesFromTransactions()
      return Object.entries(state.balancesByCategory).map(([categoria, row]) => ({
        categoria,
        ...row
      }))
    }
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
    if (state.listScope === 'all') return state.items
    const email = auth.user.value?.email?.toLowerCase()
    if (!email) return state.items
    return state.items.filter(
      (t) => !t.userEmail || t.userEmail.toLowerCase() === email
    )
  })

  const createReallocation = async (payload) => {
    await transactionRepository.createReallocation(payload)
    await Promise.all([loadMine(), loadMyBalances()])
  }

  const loadBalancesForUser = async (userId) => {
    if (!userId) {
      return loadMyBalances()
    }
    const { balances } = await transactionRepository.getUserBalances(userId)
    applyBalances(balances)
    return balances
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
    loadBalancesForUser,
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
