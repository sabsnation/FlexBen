<template>
  <div class="cat-picker" :class="{ 'cat-picker--compact': compact }">
    <button
      v-for="(opt, i) in options"
      :key="opt.value"
      type="button"
      class="cat-picker__item"
      :class="{
        'is-selected': modelValue === opt.value,
        'is-disabled': opt.disabled
      }"
      :disabled="opt.disabled"
      @click="select(opt)"
    >
      <span class="cat-picker__dot" :style="{ background: opt.color || colorAt(i) }" />
      <span class="cat-picker__body">
        <span class="cat-picker__name">{{ opt.label }}</span>
        <span v-if="showBalance && opt.saldo != null" class="cat-picker__meta">
          Disponível {{ formatCurrency(opt.saldo) }}
        </span>
      </span>
      <Icon v-if="modelValue === opt.value" name="check-circle" :size="18" class="cat-picker__check" />
    </button>
    <p v-if="!options.length" class="cat-picker__empty muted">{{ emptyMessage }}</p>
  </div>
</template>

<script setup>
import Icon from './Icon.vue'
import { colorAt } from '../config/chartTheme.js'

defineProps({
  modelValue: { type: String, default: '' },
  options: { type: Array, default: () => [] },
  showBalance: { type: Boolean, default: true },
  compact: { type: Boolean, default: false },
  emptyMessage: { type: String, default: 'Nenhuma categoria disponível.' }
})

const emit = defineEmits(['update:modelValue'])

const formatCurrency = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const select = (opt) => {
  if (opt.disabled) return
  emit('update:modelValue', opt.value)
}
</script>

<style scoped>
.cat-picker {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
  gap: 10px;
}
.cat-picker--compact {
  grid-template-columns: 1fr;
}
.cat-picker__item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  text-align: left;
  border: 2px solid var(--border-light);
  border-radius: var(--radius-md);
  background: var(--surface);
  cursor: pointer;
  transition: border-color var(--transition), box-shadow var(--transition), background var(--transition);
  box-shadow: var(--shadow-sm);
}
.cat-picker__item:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--brand-primary) 40%, var(--border-light));
  box-shadow: var(--shadow-md);
}
.cat-picker__item.is-selected {
  border-color: var(--brand-primary);
  background: color-mix(in srgb, var(--brand-primary) 6%, var(--surface));
  box-shadow: 0 0 0 1px var(--brand-primary);
}
.cat-picker__item.is-disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.cat-picker__dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  margin-top: 4px;
  flex-shrink: 0;
}
.cat-picker__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.cat-picker__name {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--text-strong);
  line-height: 1.3;
}
.cat-picker__meta {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}
.cat-picker__check {
  color: var(--brand-primary);
  flex-shrink: 0;
  margin-top: 1px;
}
.cat-picker__empty {
  grid-column: 1 / -1;
  font-size: var(--text-sm);
  padding: 0.5rem 0;
}
</style>
