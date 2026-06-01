<template>
  <div class="line-chart" :style="{ height: height + 'px' }">
    <Line :data="chartData" :options="chartOptions" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import { colorAt } from '../../config/chartTheme.js'
import {
  ensureChartJs,
  basePlugins,
  cartesianScales,
  currencyTooltipLabel
} from './chartJsSetup.js'

ensureChartJs()

const props = defineProps({
  labels: { type: Array, default: () => [] },
  series: { type: Array, default: () => [] },
  height: { type: Number, default: 240 }
})

function withAlpha(hex, alpha) {
  if (!hex?.startsWith('#') || hex.length < 7) return hex
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const chartData = computed(() => ({
  labels: props.labels,
  datasets: props.series.map((s, i) => {
    const color = s.color || colorAt(i)
    return {
      label: s.name,
      data: (s.values || []).map((v) => Number(v) || 0),
      borderColor: color,
      backgroundColor: withAlpha(color, 0.12),
      fill: true,
      tension: 0.42,
      borderWidth: 2.5,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: '#ffffff',
      pointBorderColor: color,
      pointBorderWidth: 2,
      pointHoverBackgroundColor: color,
      pointHoverBorderColor: '#ffffff'
    }
  })
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  animation: { duration: 900, easing: 'easeOutQuart' },
  plugins: {
    ...basePlugins({ legend: props.series.length > 1 }),
    tooltip: {
      ...basePlugins().tooltip,
      callbacks: {
        label(ctx) {
          return `${ctx.dataset.label}: ${currencyTooltipLabel(ctx.parsed.y)}`
        }
      }
    }
  },
  scales: cartesianScales({ currency: true })
}))
</script>

<style scoped>
.line-chart {
  width: 100%;
  position: relative;
}
</style>
