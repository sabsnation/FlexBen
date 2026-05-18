<template>
  <span class="badge" :class="badgeClass">{{ label }}</span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: { type: String, default: '' }
})

const normalize = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replaceAll(' ', '_')

const labelMap = {
  em_analise: 'Em análise',
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  reprovado: 'Reprovado',
  liquidado: 'Liquidado',
  concluida: 'Concluída',
  ativo: 'Ativo',
  inativo: 'Inativo',
  ativa: 'Ativa',
  inativa: 'Inativa',
  entrada: 'Entrada',
  saida: 'Saída'
}

const label = computed(() => {
  const key = normalize(props.status)
  return labelMap[key] || props.status || '-'
})

const badgeClass = computed(() => {
  const x = normalize(props.status)
  if (['aprovado', 'concluida', 'ativo', 'ativa', 'entrada'].includes(x)) return 'badge-success'
  if (['em_analise', 'pendente'].includes(x)) return 'badge-warning'
  if (['reprovado', 'inativo', 'inativa', 'saida'].includes(x)) return 'badge-danger'
  if (x === 'liquidado') return 'badge-info'
  return 'badge-secondary'
})
</script>
