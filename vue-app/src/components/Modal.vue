<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="modal-overlay" @click.self="$emit('close')">
        <div class="modal" :style="{ maxWidth }" role="dialog" aria-modal="true">
          <div class="modal-header">
            <h3>{{ title }}</h3>
            <button
              class="btn-icon"
              type="button"
              @click="$emit('close')"
              aria-label="Fechar"
            >
              <Icon name="x" :size="16" />
            </button>
          </div>
          <div class="modal-body">
            <slot />
          </div>
          <div v-if="$slots.footer" class="modal-footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import Icon from './Icon.vue'

defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  maxWidth: { type: String, default: '520px' }
})
defineEmits(['close'])
</script>

<style scoped>
.modal-enter-active, .modal-leave-active {
  transition: opacity var(--duration) var(--ease);
}
.modal-enter-active .modal, .modal-leave-active .modal {
  transition: transform var(--duration) var(--ease-out), opacity var(--duration) var(--ease);
}
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .modal {
  opacity: 0;
  transform: translateY(12px) scale(0.97);
}
.modal-leave-to .modal {
  opacity: 0;
  transform: translateY(8px) scale(0.97);
}
</style>
