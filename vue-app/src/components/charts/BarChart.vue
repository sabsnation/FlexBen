<template>
  <div class="bar-chart" :class="{ horizontal }" :style="{ height: chartHeight }">
    <Bar :data="chartData" :options="chartOptions" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import { colorAt, formatChartCompact } from '../../config/chartTheme.js'
import {
  ensureChartJs,
  basePlugins,
  cartesianScales,
  currencyTooltipLabel,
  compactTooltipLabel
} from './chartJsSetup.js'

ensureChartJs()

const props = defineProps({
  items: { type: Array, default: () => [] },
  horizontal: { type: Boolean, default: true },
  height: { type: Number, default: 220 },
  formatValue: { type: Function, default: (v) => formatChartCompact(v) },
  currency: { type: Boolean, default: false }
})

const chartHeight = computed(() => {
  if (!props.horizontal) return `${props.height}px`
  const rows = Math.max(props.items.length, 1)
  return `${Math.min(320, Math.max(props.height, rows * 44))}px`
})

const chartData = computed(() => ({
  labels: props.items.map((i) => i.label),
  datasets: [
    {
      data: props.items.map((i) => Number(i.value) || 0),
      backgroundColor: props.items.map((i, idx) => i.color || colorAt(idx)),
      borderRadius: props.horizontal ? 999 : 8,
      borderSkipped: false,
      maxBarThickness: props.horizontal ? 14 : 48,
      hoverBackgroundColor: props.items.map((i, idx) => i.color || colorAt(idx))
    }
  ]
}))

const chartOptions = computed(() => ({
  indexAxis: props.horizontal ? 'y' : 'x',
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 800, easing: 'easeOutQuart' },
  plugins: {
    ...basePlugins(),
    tooltip: {
      ...basePlugins().tooltip,
      callbacks: {
        label(ctx) {
          const val = props.currency
            ? currencyTooltipLabel(ctx.parsed[props.horizontal ? 'x' : 'y'])
            : compactTooltipLabel(ctx.parsed[props.horizontal ? 'x' : 'y'])
          return `${ctx.label}: ${val}`
        }
      }
    }
  },
  scales: cartesianScales({ horizontal: props.horizontal, currency: props.currency })
}))
</script>

<style scoped>
.bar-chart {
  width: 100%;
  position: relative;
}
</style>
