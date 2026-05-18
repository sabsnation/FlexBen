<template>
  <div class="empty-state">
    <div class="empty-state__icon">{{ icon }}</div>
    <h4>{{ title }}</h4>
    <p v-if="message" class="muted">{{ message }}</p>
    <slot />
  </div>
</template>

<script setup>
defineProps({
  icon: { type: String, default: '◯' },
  title: { type: String, required: true },
  message: { type: String, default: '' }
})
</script>

<style scoped>
.empty-state {
  text-align: center;
  padding: 2.5rem 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-muted);
}
.empty-state__icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--surface-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: var(--brand-primary);
  margin-bottom: 0.5rem;
}
.empty-state h4 { color: var(--text-strong); }
</style>
