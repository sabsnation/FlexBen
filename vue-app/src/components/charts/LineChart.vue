<template>
  <div class="line-chart">
    <svg :viewBox="`0 0 ${width} ${height}`" class="line-svg" preserveAspectRatio="none">
      <defs>
        <linearGradient
          v-for="(s, i) in series"
          :key="'grad-' + i"
          :id="'line-grad-' + i"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0%" :stop-color="s.color || colorAt(i)" stop-opacity="0.25" />
          <stop offset="100%" :stop-color="s.color || colorAt(i)" stop-opacity="0" />
        </linearGradient>
      </defs>
      <line
        v-for="(tick, i) in gridLines"
        :key="'g-' + i"
        :x1="padL"
        :y1="tick"
        :x2="width - padR"
        :y2="tick"
        class="grid-line"
      />
      <g v-for="(s, si) in normalizedSeries" :key="'series-' + si">
        <polygon v-if="s.area" :points="s.area" :fill="`url(#line-grad-${si})`" />
        <polyline :points="s.line" fill="none" :stroke="s.color" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
        <circle
          v-for="(pt, pi) in s.points"
          :key="'pt-' + si + '-' + pi"
          :cx="pt.x"
          :cy="pt.y"
          r="3.5"
          :fill="s.color"
          stroke="white"
          stroke-width="1.5"
        />
      </g>
      <text
        v-for="(lbl, i) in xLabels"
        :key="'xl-' + i"
        :x="lbl.x"
        :y="height - 6"
        text-anchor="middle"
        class="axis-label"
      >
        {{ lbl.text }}
      </text>
    </svg>
    <ul v-if="series.length > 1" class="line-legend">
      <li v-for="(s, i) in series" :key="'leg-' + i">
        <span class="line-legend__line" :style="{ background: s.color || colorAt(i) }" />
        {{ s.name }}
      </li>
    </ul>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { colorAt } from '../../config/chartTheme.js'

const props = defineProps({
  labels: { type: Array, default: () => [] },
  series: { type: Array, default: () => [] },
  width: { type: Number, default: 420 },
  height: { type: Number, default: 200 },
  padL: { type: Number, default: 12 },
  padR: { type: Number, default: 12 },
  padT: { type: Number, default: 14 },
  padB: { type: Number, default: 24 }
})

const maxY = computed(() => {
  let m = 0
  for (const s of props.series) {
    for (const v of s.values || []) {
      m = Math.max(m, Number(v) || 0)
    }
  }
  return m || 1
})

const innerW = computed(() => props.width - props.padL - props.padR)
const innerH = computed(() => props.height - props.padT - props.padB)

const normalizedSeries = computed(() => {
  const n = props.labels.length
  if (!n) return []
  return props.series.map((s, si) => {
    const color = s.color || colorAt(si)
    const values = s.values || []
    const points = values.map((val, i) => {
      const x = props.padL + (n <= 1 ? innerW.value / 2 : (i / (n - 1)) * innerW.value)
      const y = props.padT + innerH.value - ((Number(val) || 0) / maxY.value) * innerH.value
      return { x, y }
    })
    const line = points.map((p) => `${p.x},${p.y}`).join(' ')
    const area =
      points.length > 1
        ? `${props.padL},${props.padT + innerH.value} ${line} ${points[points.length - 1].x},${props.padT + innerH.value}`
        : ''
    return { color, points, line, area }
  })
})

const xLabels = computed(() => {
  const n = props.labels.length
  if (!n) return []
  return props.labels.map((text, i) => ({
    text: String(text).slice(0, 6),
    x: props.padL + (n <= 1 ? innerW.value / 2 : (i / (n - 1)) * innerW.value)
  }))
})

const gridLines = computed(() => {
  const lines = []
  for (let i = 0; i <= 3; i++) {
    lines.push(props.padT + (innerH.value / 3) * i)
  }
  return lines
})
</script>

<style scoped>
.line-chart { width: 100%; }
.line-svg {
  width: 100%;
  height: auto;
  max-height: 220px;
  display: block;
}
.grid-line {
  stroke: var(--border-light);
  stroke-width: 1;
  stroke-dasharray: 3 4;
}
.axis-label {
  font-size: 9px;
  fill: var(--text-muted);
  font-weight: 600;
}
.line-legend {
  list-style: none;
  margin: 0.75rem 0 0;
  padding: 0;
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  font-size: 0.78rem;
  color: var(--text-muted);
  font-weight: 600;
}
.line-legend li {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.line-legend__line {
  width: 18px;
  height: 3px;
  border-radius: 2px;
}
</style>
