<template>
  <div class="chart-card card">
    <div class="chart-card__head">
      <div>
        <h3 class="chart-card__title">
          <span v-if="icon" class="icon-bg sm"><Icon :name="icon" :size="14" /></span>
          {{ title }}
        </h3>
        <p v-if="subtitle" class="chart-card__subtitle muted">{{ subtitle }}</p>
      </div>
      <slot name="actions" />
    </div>
    <div class="chart-card__body" :style="{ minHeight: minHeight }">
      <slot />
    </div>
    <ul v-if="legend?.length" class="chart-legend">
      <li v-for="item in legend" :key="item.label">
        <span class="chart-legend__dot" :style="{ background: item.color }" />
        <span class="chart-legend__label">{{ item.label }}</span>
        <span v-if="item.value != null" class="chart-legend__value">{{ item.value }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup>
import Icon from '../Icon.vue'

defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  icon: { type: String, default: 'bar-chart' },
  minHeight: { type: String, default: '220px' },
  legend: { type: Array, default: () => [] }
})
</script>

<style scoped>
.chart-card__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}
.chart-card__title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
}
.chart-card__subtitle {
  margin: 4px 0 0;
  font-size: 0.8rem;
}
.chart-card__body {
  display: flex;
  align-items: center;
  justify-content: center;
}
.chart-legend {
  list-style: none;
  margin: 1rem 0 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
}
.chart-legend li {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  color: var(--text-muted);
}
.chart-legend__dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  flex-shrink: 0;
}
.chart-legend__label { color: var(--text-strong); font-weight: 600; }
.chart-legend__value { font-variant-numeric: tabular-nums; }
</style>
