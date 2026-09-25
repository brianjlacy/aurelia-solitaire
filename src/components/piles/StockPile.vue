<script setup lang="ts">
import { computed } from 'vue'
import type { DrawCount } from '@/domain/models/GameState'
import type { PileCards } from '@/domain/models/Pile'
import CardBack from '../cards/CardBack.vue'
import { useBoardContext } from '../game/boardContext'

const props = defineProps<{
  cards: PileCards
  wasteCount: number
  drawCount: DrawCount
  hint?: boolean
}>()

const board = useBoardContext()

const label = computed(() => {
  if (props.cards.length > 0) {
    const n = props.cards.length
    return `Stock, ${n} ${n === 1 ? 'card' : 'cards'}. Draw ${props.drawCount === 1 ? 'one' : 'three'}.`
  }
  return props.wasteCount > 0 ? 'Stock is empty. Turn the waste pile over.' : 'Stock is empty.'
})
</script>

<template>
  <div class="pile stock-pile" data-pile-anchor="stock">
    <button
      type="button"
      class="stock-button"
      :class="{ 'card--hint': hint }"
      :aria-label="label"
      :disabled="cards.length === 0 && wasteCount === 0"
      data-nav-area="top"
      data-nav-col="0"
      @click="board.onStockClick()"
    >
      <span v-if="cards.length > 0" class="stock-stack" aria-hidden="true" data-stock-card>
        <CardBack />
      </span>
      <span v-else class="pile-slot" aria-hidden="true">
        <svg
          v-if="wasteCount > 0"
          viewBox="0 0 24 24"
          width="40%"
          height="40%"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" />
          <path d="M3 21v-5h5" />
        </svg>
        <span v-else>✕</span>
      </span>
    </button>
    <span v-if="cards.length > 0" class="stock-count" aria-hidden="true">{{ cards.length }}</span>
  </div>
</template>
