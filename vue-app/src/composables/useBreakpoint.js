import { ref, onMounted, onUnmounted } from 'vue'

const MOBILE_MAX_WIDTH = 1024

/**
 * Viewport ≤ 1024px — alinhado ao breakpoint da sidebar em style.css.
 */
export function useBreakpoint() {
  const isMobileLayout = ref(false)
  let mediaQuery

  const sync = () => {
    isMobileLayout.value = mediaQuery?.matches ?? window.innerWidth <= MOBILE_MAX_WIDTH
  }

  onMounted(() => {
    mediaQuery = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`)
    sync()
    mediaQuery.addEventListener('change', sync)
  })

  onUnmounted(() => {
    mediaQuery?.removeEventListener('change', sync)
  })

  return { isMobileLayout }
}
