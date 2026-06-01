import { reactive } from 'vue'

const state = reactive({
  open: false,
  title: '',
  message: '',
  detail: '',
  confirmLabel: 'Confirmar',
  cancelLabel: 'Cancelar',
  variant: 'primary',
  loading: false,
  _resolve: null
})

export const useConfirm = () => {
  /**
   * @param {{ title?: string, message: string, detail?: string, confirmLabel?: string, cancelLabel?: string, variant?: 'primary'|'danger'|'warning' }} options
   * @returns {Promise<boolean>}
   */
  const confirm = (options) =>
    new Promise((resolve) => {
      state.title = options.title || 'Confirmar ação'
      state.message = options.message || ''
      state.detail = options.detail || ''
      state.confirmLabel = options.confirmLabel || 'Confirmar'
      state.cancelLabel = options.cancelLabel || 'Cancelar'
      state.variant = options.variant || 'primary'
      state.loading = false
      state._resolve = resolve
      state.open = true
    })

  const accept = () => {
    if (state.loading) return
    state.open = false
    state._resolve?.(true)
    state._resolve = null
  }

  const decline = () => {
    if (state.loading) return
    state.open = false
    state._resolve?.(false)
    state._resolve = null
  }

  const setLoading = (value) => {
    state.loading = value
  }

  return {
    confirmState: state,
    confirm,
    accept,
    decline,
    setConfirmLoading: setLoading
  }
}
