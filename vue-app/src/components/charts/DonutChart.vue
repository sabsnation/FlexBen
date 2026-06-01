<template>
  <div class="donut-wrap" :style="{ height: size + 'px' }">
    <Doughnut :data="chartData" :options="chartOptions" />
    <div v-if="centerLabel || centerValue" class="donut-center">
      <span v-if="centerValue" class="donut-center__value">{{ centerValue }}</span>
      <span v-if="centerLabel" class="donut-center__label">{{ centerLabel }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Doughnut } from 'vue-chartjs'
import { colorAt } from '../../config/chartTheme.js'
import {
  ensureChartJs,
  basePlugins,
  currencyTooltipLabel
} from './chartJsSetup.js'

ensureChartJs()

const props = defineProps({
  segments: { type: Array, default: () => [] },
  size: { type: Number, default: 220 },
  thickness: { type: Number, default: 26 },
  centerLabel: { type: String, default: '' },
  centerValue: { type: String, default: '' }
})

const activeSegments = computed(() =>
  props.segments.filter((s) => Number(s.value) > 0)
)

const chartData = computed(() => ({
  labels: activeSegments.value.map((s) => s.label),
  datasets: [
    {
      data: activeSegments.value.map((s) => Number(s.value) || 0),
      backgroundColor: activeSegments.value.map((s, i) => s.color || colorAt(i)),
      borderColor: '#ffffff',
      borderWidth: 3,
      hoverBorderColor: '#ffffff',
      hoverOffset: 10,
      borderRadius: 6,
      spacing: 2
    }
  ]
}))

const cutoutPct = computed(() => {
  const ratio = 1 - props.thickness / props.size
  return `${Math.round(Math.min(0.82, Math.max(0.5, ratio)) * 100)}%`
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: cutoutPct.value,
  animation: {
    animateRotate: true,
    animateScale: true,
    duration: 900,
    easing: 'easeOutQuart'
  },
  plugins: {
    ...basePlugins(),
    tooltip: {
      ...basePlugins().tooltip,
      callbacks: {
        label(ctx) {
          const label = ctx.label || ''
          const val = currencyTooltipLabel(ctx.parsed)
          const total = ctx.dataset.data.reduce((a, b) => a + b, 0)
          const pct = total ? ((ctx.parsed / total) * 100).toFixed(1) : 0
          return `${label}: ${val} (${pct}%)`
        }
      }
    }
  }
}))
</script>

<style scoped>
.donut-wrap {
  position: relative;
  width: 100%;
  max-width: 280px;
  margin: 0 auto;
}
.donut-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem;
  pointer-events: none;
}
.donut-center__value {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--text-strong);
  letter-spacing: -0.02em;
  line-height: 1.2;
}
.donut-center__label {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-top: 4px;
}
</style>
