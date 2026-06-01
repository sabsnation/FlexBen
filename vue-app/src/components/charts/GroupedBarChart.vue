<template>
  <div class="grouped-bars" :style="{ height: height + 'px' }">
    <Bar :data="chartData" :options="chartOptions" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import { colorAt } from '../../config/chartTheme.js'
import {
  ensureChartJs,
  basePlugins,
  cartesianScales,
  currencyTooltipLabel
} from './chartJsSetup.js'

ensureChartJs()

const props = defineProps({
  groups: { type: Array, default: () => [] },
  series: { type: Array, default: () => [] },
  height: { type: Number, default: 260 }
})

const chartData = computed(() => ({
  labels: props.groups.map((g) => g.label),
  datasets: props.series.map((s, i) => ({
    label: s.name,
    data: props.groups.map((g) => Number(g[s.key]) || 0),
    backgroundColor: s.color || colorAt(i),
    borderRadius: 8,
    borderSkipped: false,
    maxBarThickness: 40
  }))
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 800, easing: 'easeOutQuart' },
  plugins: {
    ...basePlugins({ legend: true }),
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
.grouped-bars {
  width: 100%;
  position: relative;
}
</style>
