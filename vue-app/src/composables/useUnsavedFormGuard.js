import { onMounted, onUnmounted } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { useConfirm } from '../confirm.js'

/** Warn before leaving route or closing tab when form has unsaved input. */
export function useUnsavedFormGuard(hasUnsaved) {
  const { confirm } = useConfirm()

  onBeforeRouteLeave(async (_to, _from, next) => {
    if (!hasUnsaved()) return next()
    const ok = await confirm({
      title: 'Descartar alterações?',
      message: 'Há dados preenchidos que ainda não foram enviados.',
      detail: 'Se sair agora, o formulário será limpo.',
      confirmLabel: 'Sair mesmo assim',
      cancelLabel: 'Continuar editando',
      variant: 'warning'
    })
    next(ok)
  })

  const onBeforeUnload = (e) => {
    if (!hasUnsaved()) return
    e.preventDefault()
    e.returnValue = ''
  }

  onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
  onUnmounted(() => window.removeEventListener('beforeunload', onBeforeUnload))
}
