<template>
  <Teleport to="body">
    <Transition name="confirm">
      <div
        v-if="confirmState.open"
        class="confirm-overlay"
        role="presentation"
        @click.self="decline"
      >
        <div
          class="confirm-dialog"
          role="alertdialog"
          :aria-labelledby="titleId"
          :aria-describedby="messageId"
        >
          <div class="confirm-dialog__icon" :class="`confirm-dialog__icon--${confirmState.variant}`">
            <Icon :name="iconName" :size="28" :stroke-width="2" />
          </div>

          <h2 :id="titleId" class="confirm-dialog__title">{{ confirmState.title }}</h2>
          <p :id="messageId" class="confirm-dialog__message">{{ confirmState.message }}</p>
          <p v-if="confirmState.detail" class="confirm-dialog__detail">{{ confirmState.detail }}</p>

          <div class="confirm-dialog__actions">
            <button
              type="button"
              class="btn btn-secondary btn-block-sm"
              :disabled="confirmState.loading"
              @click="decline"
            >
              {{ confirmState.cancelLabel }}
            </button>
            <button
              type="button"
              class="btn btn-block-sm"
              :class="confirmBtnClass"
              :disabled="confirmState.loading"
              @click="accept"
            >
              <Icon v-if="confirmState.loading" name="spinner" :size="14" class="spin" />
              <Icon v-else :name="confirmIcon" :size="14" />
              <span>{{ confirmState.confirmLabel }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { useConfirm } from '../confirm.js'
import Icon from './Icon.vue'

const { confirmState, accept, decline } = useConfirm()

const titleId = 'confirm-dialog-title'
const messageId = 'confirm-dialog-message'

const iconName = computed(() => {
  if (confirmState.variant === 'danger') return 'alert-triangle'
  if (confirmState.variant === 'warning') return 'alert-circle'
  return 'check-circle'
})

const confirmIcon = computed(() => {
  if (confirmState.variant === 'danger') return 'trash'
  return 'check'
})

const confirmBtnClass = computed(() => {
  if (confirmState.variant === 'danger') return 'btn-danger'
  if (confirmState.variant === 'warning') return 'btn-primary'
  return 'btn-primary'
})
</script>

<style scoped>
.confirm-enter-active,
.confirm-leave-active {
  transition: opacity var(--duration) var(--ease);
}
.confirm-enter-active .confirm-dialog,
.confirm-leave-active .confirm-dialog {
  transition:
    transform var(--duration) var(--ease-out),
    opacity var(--duration) var(--ease);
}
.confirm-enter-from,
.confirm-leave-to {
  opacity: 0;
}
.confirm-enter-from .confirm-dialog {
  opacity: 0;
  transform: translateY(16px) scale(0.96);
}
.confirm-leave-to .confirm-dialog {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}

.confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background: var(--bg-overlay);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.confirm-dialog {
  width: 100%;
  max-width: 420px;
  background: var(--surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-xl);
  padding: var(--space-6) var(--space-6) var(--space-5);
  text-align: center;
}

.confirm-dialog__icon {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-full);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--space-4);
}
.confirm-dialog__icon--primary {
  background: var(--brand-primary-soft);
  color: var(--brand-primary-strong);
}
.confirm-dialog__icon--warning {
  background: var(--brand-warn-soft);
  color: #b45309;
}
.confirm-dialog__icon--danger {
  background: var(--brand-danger-soft);
  color: #b91c1c;
}

.confirm-dialog__title {
  font-size: var(--text-lg);
  font-weight: 800;
  margin: 0 0 var(--space-2);
  letter-spacing: -0.02em;
}

.confirm-dialog__message {
  font-size: var(--text-sm);
  color: var(--text-main);
  line-height: 1.55;
  margin: 0;
}

.confirm-dialog__detail {
  margin: var(--space-3) 0 0;
  padding: var(--space-3);
  background: var(--surface-soft);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  color: var(--text-muted);
  line-height: 1.45;
  text-align: left;
}

.confirm-dialog__actions {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-5);
  flex-direction: row-reverse;
}

@media (max-width: 480px) {
  .confirm-overlay {
    align-items: flex-end;
    padding: 0;
  }
  .confirm-dialog {
    max-width: none;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    padding: var(--space-5) var(--space-4);
  }
  .confirm-dialog__actions {
    flex-direction: column-reverse;
  }
  .confirm-dialog__actions .btn {
    width: 100%;
  }
}
</style>
