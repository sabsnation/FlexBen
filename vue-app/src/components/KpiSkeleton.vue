<template>
  <div class="grid cols-4 mb-3 kpi-skeleton" :class="{ 'mb-0': !marginBottom }">
    <div v-for="n in count" :key="n" class="card kpi-skeleton__card">
      <div class="skeleton kpi-skeleton__label" />
      <div class="skeleton kpi-skeleton__value" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  count: { type: Number, default: 4 },
  marginBottom: { type: Boolean, default: true }
})
</script>

<style scoped>
.kpi-skeleton__card {
  padding: 1rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.kpi-skeleton__label {
  height: 12px;
  width: 55%;
}
.kpi-skeleton__value {
  height: 28px;
  width: 70%;
}
</style>
