<template>
  <div class="container">
    <PageHeader
      title="Categorias de benefícios"
      subtitle="Veja os tipos de benefício disponíveis no programa flex e seus tetos mensais de referência."
      eyebrow="Catálogo flex"
    />

    <div v-if="!activeList.length" class="card">
      <EmptyState
        icon="layers"
        title="Nenhuma categoria ativa"
        message="O RH ainda não habilitou categorias para o programa. Volte em breve."
      />
    </div>

    <div v-else class="grid cols-3">
      <div v-for="c in activeList" :key="c.id" class="card category-card">
        <div class="category-card__head">
          <span class="category-card__chip" :style="{ background: getCategoryColor(c.nome) }">
            <Icon :name="getCategoryIcon(c.nome)" :size="18" />
          </span>
          <StatusBadge :status="c.status" />
        </div>
        <div class="category-card__body">
          <h3>{{ c.nome }}</h3>
          <span class="muted text-xs">Limite mensal por colaborador</span>
          <h2>{{ formatCurrency(c.limite) }}</h2>
        </div>
        <p class="muted text-xs">Valor aplicado a cada colaborador ativo na carga mensal.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useCategories } from '../categories'
import PageHeader from '../components/PageHeader.vue'
import StatusBadge from '../components/StatusBadge.vue'
import EmptyState from '../components/EmptyState.vue'
import Icon from '../components/Icon.vue'

const { categories, loadCategories } = useCategories()

onMounted(async () => {
  await loadCategories()
})

const activeList = computed(() => categories.value.filter((c) => c.status !== 'Inativa'))

const formatCurrency = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const getCategoryColor = (name) => {
  const colors = {
    Alimentação: 'linear-gradient(135deg, #f59e0b, #ea580c)',
    Mobilidade: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    Saúde: 'linear-gradient(135deg, #10b981, #059669)',
    Educação: 'linear-gradient(135deg, #6366f1, #4338ca)',
    Cultura: 'linear-gradient(135deg, #a855f7, #7c3aed)',
    'Home Office': 'linear-gradient(135deg, #ec4899, #db2777)',
    'Bem-estar': 'linear-gradient(135deg, #14b8a6, #0d9488)'
  }
  return colors[name] || 'linear-gradient(135deg, #6366f1, #4338ca)'
}

const getCategoryIcon = (name) => {
  const icons = {
    Alimentação: 'inbox',
    Mobilidade: 'send',
    Saúde: 'shield',
    Educação: 'briefcase',
    Cultura: 'star',
    'Home Office': 'briefcase',
    'Bem-estar': 'activity'
  }
  return icons[name] || 'layers'
}
</script>

<style scoped>
.category-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: relative;
  overflow: hidden;
}
.category-card__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.category-card__chip {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: var(--shadow-sm);
}
.category-card__body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.category-card__body h3 { font-size: 1.1rem; margin-bottom: 0.4rem; }
.category-card__body h2 { color: var(--brand-primary); font-size: 1.65rem; letter-spacing: -0.02em; }
</style>
