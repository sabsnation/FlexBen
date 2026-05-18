import { reactive } from 'vue'

const state = reactive({
  message: '',
  type: 'success', // 'success', 'error', 'info'
  visible: false
})

export const useToast = () => {
  const showToast = (msg, type = 'success') => {
    state.message = msg
    state.type = type
    state.visible = true
    setTimeout(() => {
      state.visible = false
    }, 3000)
  }

  return {
    toast: state,
    showToast
  }
}
