import { reactive, computed } from 'vue'
import { categoryRepository } from './repositories/CategoryApiRepository.js'

const state = reactive({
  categories: []
})

export const useCategories = () => {
  const loadCategories = async () => {
    const categories = await categoryRepository.list()
    state.categories = categories
    return categories
  }

  const addCategory = async (cat) => {
    const category = await categoryRepository.create(cat)
    state.categories.push(category)
  }

  const deleteCategory = async (id) => {
    await categoryRepository.remove(id)
    state.categories = state.categories.filter((c) => c.id !== id)
  }

  return {
    categories: computed(() => state.categories),
    loadCategories,
    addCategory,
    deleteCategory
  }
}
