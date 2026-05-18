<template>
  <div class="kpi" :class="tone">
    <span class="kpi__label">{{ label }}</span>
    <span class="kpi__value" :style="valueColor ? { color: valueColor } : null">
      {{ formattedValue }}
    </span>
    <span v-if="hint" class="kpi__hint">{{ hint }}</span>
    <slot />
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  hint: { type: String, default: '' },
  tone: { type: String, default: '' },
  format: { type: String, default: 'raw' },
  valueColor: { type: String, default: '' }
})

const formattedValue = computed(() => {
  if (props.format === 'currency') {
    const n = Number(props.value || 0)
    return `R$ ${n.toFixed(2)}`
  }
  if (props.format === 'percent') {
    const n = Number(props.value || 0)
    return `${n.toFixed(2)}%`
  }
  return props.value
})
</script>
