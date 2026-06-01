<template>
  <div class="donut-wrap" :style="{ width: size + 'px', height: size + 'px' }">
    <svg :viewBox="`0 0 ${size} ${size}`" class="donut-svg">
      <circle
        :cx="cx"
        :cy="cy"
        :r="r"
        fill="none"
        stroke="var(--surface-soft)"
        :stroke-width="thickness"
      />
      <circle
        v-for="(seg, i) in arcSegments"
        :key="'arc-' + i"
        :cx="cx"
        :cy="cy"
        :r="r"
        fill="none"
        :stroke="seg.color"
        :stroke-width="thickness"
        stroke-linecap="butt"
        :stroke-dasharray="seg.dash"
        :stroke-dashoffset="seg.offset"
        transform="rotate(-90)"
        :transform-origin="`${cx}px ${cy}px`"
      />
    </svg>
    <div v-if="centerLabel || centerValue" class="donut-center">
      <span v-if="centerValue" class="donut-center__value">{{ centerValue }}</span>
      <span v-if="centerLabel" class="donut-center__label">{{ centerLabel }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { colorAt } from '../../config/chartTheme.js'

const props = defineProps({
  segments: { type: Array, default: () => [] },
  size: { type: Number, default: 200 },
  thickness: { type: Number, default: 26 },
  centerLabel: { type: String, default: '' },
  centerValue: { type: String, default: '' }
})

const cx = computed(() => props.size / 2)
const cy = computed(() => props.size / 2)
const r = computed(() => (props.size - props.thickness) / 2 - 4)

const total = computed(() =>
  props.segments.reduce((sum, s) => sum + Math.max(0, Number(s.value) || 0), 0)
)

const circumference = computed(() => 2 * Math.PI * r.value)

const arcSegments = computed(() => {
  if (!total.value) return []
  let offset = 0
  const circ = circumference.value
  return props.segments
    .filter((s) => Number(s.value) > 0)
    .map((s, i) => {
      const frac = Number(s.value) / total.value
      const dash = `${frac * circ} ${circ}`
      const seg = {
        color: s.color || colorAt(i),
        dash,
        offset: -offset
      }
      offset += frac * circ
      return seg
    })
})
</script>

<style scoped>
.donut-wrap {
  position: relative;
  margin: 0 auto;
}
.donut-svg {
  width: 100%;
  height: 100%;
  display: block;
}
.donut-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 1.5rem;
  pointer-events: none;
}
.donut-center__value {
  font-size: 1.05rem;
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
