<template>
  <div class="card table-skeleton">
    <div v-for="n in rows" :key="n" class="table-skeleton__row">
      <div class="skeleton table-skeleton__cell table-skeleton__cell--wide" />
      <div class="skeleton table-skeleton__cell" />
      <div class="skeleton table-skeleton__cell table-skeleton__cell--sm" />
      <div class="skeleton table-skeleton__cell table-skeleton__cell--sm" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  rows: { type: Number, default: 6 }
})
</script>

<style scoped>
.table-skeleton {
  padding: 0.75rem 1rem;
}
.table-skeleton__row {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 0.65rem 0;
  border-bottom: 1px solid var(--border-light);
}
.table-skeleton__row:last-child {
  border-bottom: none;
}
.table-skeleton__cell {
  height: 14px;
  flex: 1;
  min-width: 48px;
}
.table-skeleton__cell--wide {
  flex: 2.2;
}
.table-skeleton__cell--sm {
  max-width: 72px;
}
</style>
