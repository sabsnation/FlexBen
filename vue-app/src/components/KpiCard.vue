<template>
  <div class="kpi" :class="tone">
    <div class="kpi__head">
      <span class="kpi__label">{{ label }}</span>
      <Icon v-if="icon" :name="icon" :size="16" class="kpi__icon" />
    </div>
    <span class="kpi__value" :style="valueColor ? { color: valueColor } : null">
      {{ formattedValue }}
    </span>
    <div v-if="hint || trend" class="kpi__foot">
      <span v-if="trend" :class="['kpi__trend', trendDirection]">
        <Icon :name="trendDirection === 'up' ? 'arrow-up' : 'arrow-down'" :size="12" />
        {{ trendLabel }}
      </span>
      <span v-if="hint" class="kpi__hint">{{ hint }}</span>
    </div>
    <slot />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import Icon from './Icon.vue'

const props = defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  hint: { type: String, default: '' },
  tone: { type: String, default: '' },
  format: { type: String, default: 'raw' },
  valueColor: { type: String, default: '' },
  icon: { type: String, default: '' },
  trend: { type: [Number, String], default: null }
})

const formattedValue = computed(() => {
  if (props.format === 'currency') {
    const n = Number(props.value || 0)
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }
  if (props.format === 'percent') {
    const n = Number(props.value || 0)
    return `${n.toFixed(1)}%`
  }
  return props.value
})

const trendDirection = computed(() => (Number(props.trend) >= 0 ? 'up' : 'down'))
const trendLabel = computed(() => {
  const n = Number(props.trend)
  if (Number.isNaN(n)) return props.trend
  return `${Math.abs(n).toFixed(1)}%`
})
</script>

<style scoped>
.kpi__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}
.kpi__icon {
  color: var(--text-muted);
  position: relative;
  z-index: 1;
}
.kpi.success .kpi__icon { color: #059669; }
.kpi.warning .kpi__icon { color: #b45309; }
.kpi.danger  .kpi__icon { color: #b91c1c; }
.kpi.info    .kpi__icon { color: #075985; }
.kpi__foot {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.kpi__trend {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: var(--radius-full);
}
.kpi__trend.up { background: var(--brand-accent-soft); color: #047857; }
.kpi__trend.down { background: var(--brand-danger-soft); color: #b91c1c; }
</style>
