<template>
  <div class="empty-state">
    <div class="empty-state__icon">
      <Icon :name="icon" :size="28" :stroke-width="1.8" />
    </div>
    <h4>{{ title }}</h4>
    <p v-if="message" class="muted">{{ message }}</p>
    <div v-if="$slots.default" class="empty-state__actions">
      <slot />
    </div>
  </div>
</template>

<script setup>
import Icon from './Icon.vue'

defineProps({
  icon: { type: String, default: 'inbox' },
  title: { type: String, required: true },
  message: { type: String, default: '' }
})
</script>

<style scoped>
.empty-state {
  text-align: center;
  padding: 3rem 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  color: var(--text-muted);
}
.empty-state__icon {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, var(--brand-primary-soft) 0%, var(--surface-strong) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--brand-primary);
  margin-bottom: 0.6rem;
  border: 1px solid var(--border-subtle);
}
.empty-state h4 {
  color: var(--text-strong);
  margin-bottom: 0.1rem;
}
.empty-state p { max-width: 42ch; line-height: 1.5; }
.empty-state__actions {
  margin-top: 0.85rem;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
}
</style>
