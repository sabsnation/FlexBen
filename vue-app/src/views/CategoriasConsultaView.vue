<template>
  <div class="container">
    <PageHeader
      title="Categorias de benefícios"
      subtitle="Veja os tipos de benefício disponíveis no programa flex e seus tetos mensais de referência."
    />

    <div v-if="!activeList.length" class="card">
      <EmptyState
        icon="▤"
        title="Nenhuma categoria ativa"
        message="O RH ainda não habilitou categorias para o programa. Volte em breve."
      />
    </div>

    <div v-else class="grid cols-3">
      <div v-for="c in activeList" :key="c.id" class="card category-card">
        <div class="category-card__head">
          <strong>{{ c.nome }}</strong>
          <StatusBadge :status="c.status" />
        </div>
        <div class="category-card__limit">
          <span class="muted">Limite mensal</span>
          <h2>R$ {{ Number(c.limite).toFixed(2) }}</h2>
        </div>
        <p class="muted" style="font-size: 0.82rem;">Valor aplicado a cada colaborador ativo na carga mensal.</p>
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

const { categories, loadCategories } = useCategories()

onMounted(async () => {
  await loadCategories()
})

const activeList = computed(() => categories.value.filter((c) => c.status !== 'Inativa'))
</script>

<style scoped>
.category-card { display: flex; flex-direction: column; gap: 0.5rem; }
.category-card__head { display: flex; justify-content: space-between; align-items: center; }
.category-card__head strong { font-size: 1.05rem; }
.category-card__limit { display: flex; flex-direction: column; gap: 4px; }
.category-card__limit h2 { color: var(--brand-primary); }
</style>
