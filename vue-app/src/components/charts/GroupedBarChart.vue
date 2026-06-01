<template>
  <div class="grouped-bars">
    <svg :viewBox="`0 0 ${width} ${height}`" class="grouped-svg" preserveAspectRatio="xMidYMid meet">
      <g v-for="(grp, gi) in layoutGroups" :key="'g-' + gi">
        <text
          :x="grp.labelX"
          :y="height - 6"
          text-anchor="middle"
          class="axis-label"
        >
          {{ truncate(grp.label, 8) }}
        </text>
        <rect
          v-for="(bar, bi) in grp.bars"
          :key="'b-' + gi + '-' + bi"
          :x="bar.x"
          :y="bar.y"
          :width="bar.w"
          :height="bar.h"
          :rx="3"
          :fill="bar.color"
        />
      </g>
      <g class="series-legend">
        <g v-for="(s, i) in seriesKeys" :key="'sk-' + i" :transform="`translate(${12 + i * 100}, 8)`">
          <rect width="10" height="10" :rx="2" :fill="s.color" />
          <text x="14" y="9" class="legend-text">{{ s.name }}</text>
        </g>
      </g>
    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { colorAt } from '../../config/chartTheme.js'

const props = defineProps({
  groups: { type: Array, default: () => [] },
  series: { type: Array, default: () => [] },
  width: { type: Number, default: 480 },
  height: { type: Number, default: 240 },
  padL: { type: Number, default: 12 },
  padR: { type: Number, default: 12 },
  padT: { type: Number, default: 28 },
  padB: { type: Number, default: 28 }
})

const seriesKeys = computed(() =>
  props.series.map((s, i) => ({
    name: s.name,
    color: s.color || colorAt(i)
  }))
)

const maxVal = computed(() => {
  let m = 0
  for (const g of props.groups) {
    for (const s of props.series) {
      m = Math.max(m, Number(g[s.key]) || 0)
    }
  }
  return m || 1
})

const layoutGroups = computed(() => {
  const n = props.groups.length
  if (!n) return []
  const innerW = props.width - props.padL - props.padR
  const innerH = props.height - props.padT - props.padB
  const groupW = innerW / n
  const barCount = props.series.length
  const gap = 4
  const barW = (groupW - gap * (barCount + 1)) / barCount

  return props.groups.map((g, gi) => {
    const baseX = props.padL + gi * groupW
    const bars = props.series.map((s, bi) => {
      const val = Number(g[s.key]) || 0
      const h = (val / maxVal.value) * innerH
      return {
        x: baseX + gap + bi * (barW + gap),
        y: props.padT + innerH - h,
        w: barW,
        h,
        color: s.color || colorAt(bi)
      }
    })
    return {
      label: g.label,
      labelX: baseX + groupW / 2,
      bars
    }
  })
})

const truncate = (s, n) => {
  const str = String(s || '')
  return str.length > n ? `${str.slice(0, n - 1)}…` : str
}
</script>

<style scoped>
.grouped-bars { width: 100%; }
.grouped-svg {
  width: 100%;
  height: auto;
  max-height: 260px;
  display: block;
}
.axis-label {
  font-size: 9px;
  fill: var(--text-muted);
  font-weight: 600;
}
.legend-text {
  font-size: 9px;
  fill: var(--text-muted);
  font-weight: 600;
}
</style>
