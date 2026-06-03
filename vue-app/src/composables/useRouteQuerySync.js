import { watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

/**
 * Sync reactive refs with URL query params (replace, no history spam).
 * @param {Array<{ query: string, get: () => import('vue').Ref|string, set?: (v: string) => void }>} bindings
 */
export function useRouteQuerySync(bindings) {
  const route = useRoute()
  const router = useRouter()
  let applying = false

  const readQuery = () => {
    applying = true
    for (const { query, get, set } of bindings) {
      const raw = route.query[query]
      if (raw == null || raw === '') continue
      const val = Array.isArray(raw) ? raw[0] : String(raw)
      if (set) set(val)
      else {
        const target = get()
        if (target && typeof target === 'object' && 'value' in target) target.value = val
      }
    }
    applying = false
  }

  onMounted(readQuery)

  watch(
    () =>
      bindings.map(({ query, get }) => {
        const t = get()
        const v = t && typeof t === 'object' && 'value' in t ? t.value : t
        return `${query}=${v ?? ''}`
      }).join('&'),
    () => {
      if (applying) return
      const next = { ...route.query }
      let changed = false
      for (const { query, get } of bindings) {
        const t = get()
        const v = String((t && typeof t === 'object' && 'value' in t ? t.value : t) ?? '').trim()
        const cur = next[query] != null ? String(Array.isArray(next[query]) ? next[query][0] : next[query]) : ''
        if (v) {
          if (cur !== v) {
            next[query] = v
            changed = true
          }
        } else if (next[query] != null) {
          delete next[query]
          changed = true
        }
      }
      if (changed) router.replace({ query: next })
    }
  )
}
