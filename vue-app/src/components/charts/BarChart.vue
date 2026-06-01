<template>
  <div class="bar-chart" :class="{ horizontal }">
    <svg
      v-if="!horizontal"
      :viewBox="`0 0 ${width} ${height}`"
      class="bar-svg"
      preserveAspectRatio="xMidYMid meet"
    >
      <line
        v-for="(tick, i) in yTicks"
        :key="'grid-' + i"
        :x1="padL"
        :y1="tick.y"
        :x2="width - padR"
        :y2="tick.y"
        class="grid-line"
      />
      <g v-for="(item, i) in layoutItems" :key="'bar-' + i">
        <rect
          :x="item.x"
          :y="item.y"
          :width="item.w"
          :height="item.h"
          :rx="4"
          :fill="item.color"
          opacity="0.92"
        />
        <text
          :x="item.x + item.w / 2"
          :y="height - 8"
          text-anchor="middle"
          class="bar-label"
        >
          {{ truncate(item.label, 10) }}
        </text>
      </g>
    </svg>

    <div v-else class="bar-rows">
      <div v-for="(item, i) in itemsWithMeta" :key="'row-' + i" class="bar-row">
        <span class="bar-row__label" :title="item.label">{{ truncate(item.label, 18) }}</span>
        <div class="bar-row__track">
          <div
            class="bar-row__fill"
            :style="{ width: item.pct + '%', background: item.color }"
          />
        </div>
        <span class="bar-row__value">{{ formatValue(item.value) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { colorAt, formatChartCompact } from '../../config/chartTheme.js'

const props = defineProps({
  items: { type: Array, default: () => [] },
  horizontal: { type: Boolean, default: true },
  height: { type: Number, default: 220 },
  width: { type: Number, default: 400 },
  padL: { type: Number, default: 12 },
  padR: { type: Number, default: 12 },
  padT: { type: Number, default: 16 },
  padB: { type: Number, default: 28 },
  formatValue: { type: Function, default: (v) => formatChartCompact(v) }
})

const maxVal = computed(() => {
  const m = Math.max(...props.items.map((x) => Number(x.value) || 0), 0)
  return m || 1
})

const itemsWithMeta = computed(() =>
  props.items.map((item, i) => ({
    label: item.label,
    value: Number(item.value) || 0,
    color: item.color || colorAt(i),
    pct: Math.min(100, ((Number(item.value) || 0) / maxVal.value) * 100)
  }))
)

const layoutItems = computed(() => {
  const n = props.items.length
  if (!n) return []
  const innerW = props.width - props.padL - props.padR
  const innerH = props.height - props.padT - props.padB
  const gap = 8
  const barW = (innerW - gap * (n - 1)) / n
  return props.items.map((item, i) => {
    const val = Number(item.value) || 0
    const h = (val / maxVal.value) * innerH
    return {
      label: item.label,
      x: props.padL + i * (barW + gap),
      y: props.padT + innerH - h,
      w: barW,
      h,
      color: item.color || colorAt(i)
    }
  })
})

const yTicks = computed(() => {
  const innerH = props.height - props.padT - props.padB
  return [0, 0.5, 1].map((t) => ({
    y: props.padT + innerH * (1 - t)
  }))
})

const truncate = (s, n) => {
  const str = String(s || '')
  return str.length > n ? `${str.slice(0, n - 1)}…` : str
}
</script>

<style scoped>
.bar-chart { width: 100%; }
.bar-svg { width: 100%; height: auto; max-height: 240px; display: block; }
.grid-line {
  stroke: var(--border-light);
  stroke-width: 1;
  stroke-dasharray: 4 4;
}
.bar-label {
  font-size: 9px;
  fill: var(--text-muted);
  font-weight: 600;
}
.bar-rows {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  width: 100%;
}
.bar-row {
  display: grid;
  grid-template-columns: minmax(72px, 28%) 1fr minmax(48px, auto);
  gap: 10px;
  align-items: center;
}
.bar-row__label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-strong);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.bar-row__track {
  height: 10px;
  background: var(--surface-soft);
  border-radius: 999px;
  overflow: hidden;
}
.bar-row__fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.4s ease;
}
.bar-row__value {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-muted);
  text-align: right;
  font-variant-numeric: tabular-nums;
}
</style>
