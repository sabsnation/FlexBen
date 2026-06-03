<template>
  <input
    ref="inputEl"
    type="text"
    inputmode="decimal"
    autocomplete="off"
    :class="inputClass"
    :value="displayText"
    :placeholder="placeholder"
    :disabled="disabled"
    :aria-label="ariaLabel"
    @input="onInput"
    @blur="onBlur"
    @focus="onFocus"
  />
</template>

<script setup>
import { ref, watch } from 'vue'
import {
  formatMoneyDisplay,
  formatDigitsAsMoney,
  parseMoneyDigits,
  moneyToDigits,
  roundMoney
} from '../services/moneyFormat.js'

const props = defineProps({
  modelValue: { type: [Number, null], default: null },
  max: { type: Number, default: undefined },
  min: { type: Number, default: undefined },
  disabled: { type: Boolean, default: false },
  placeholder: { type: String, default: '0,00' },
  inputClass: { type: String, default: '' },
  ariaLabel: { type: String, default: 'Valor em reais' }
})

const emit = defineEmits(['update:modelValue', 'blur', 'focus'])

const inputEl = ref(null)
const displayText = ref('')
const digits = ref('')
const focused = ref(false)

function syncFromModel(value) {
  if (value == null || value === '' || !Number.isFinite(Number(value))) {
    digits.value = ''
    displayText.value = ''
    return
  }
  const d = moneyToDigits(value)
  digits.value = d
  displayText.value = formatDigitsAsMoney(d)
}

watch(
  () => props.modelValue,
  (v) => {
    if (focused.value) return
    syncFromModel(v)
  },
  { immediate: true }
)

function onInput(e) {
  const raw = e.target.value.replace(/\D/g, '').slice(0, 15)
  digits.value = raw
  displayText.value = raw ? formatDigitsAsMoney(raw) : ''
  const parsed = parseMoneyDigits(raw)
  emit('update:modelValue', parsed)
}

function onFocus(e) {
  focused.value = true
  emit('focus', e)
}

function onBlur(e) {
  focused.value = false
  let v = parseMoneyDigits(digits.value)
  if (v != null) {
    if (props.max != null && Number.isFinite(props.max) && v > props.max) {
      v = roundMoney(props.max)
    }
    if (props.min != null && Number.isFinite(props.min) && v < props.min) {
      v = roundMoney(props.min)
    }
    v = roundMoney(v)
  }
  emit('update:modelValue', v)
  syncFromModel(v)
  emit('blur', e)
}

defineExpose({ focus: () => inputEl.value?.focus() })
</script>

<style scoped>
input {
  width: 100%;
  font-variant-numeric: tabular-nums;
}
</style>
