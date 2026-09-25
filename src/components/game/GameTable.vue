<script setup lang="ts">
import { computed, ref } from 'vue'
import { FOUNDATION_SUITS, type GameState } from '@/domain/models/GameState'
import type { Hint } from '@/domain/services/HintService'
import { useBoardNavigation } from '@/composables/useBoardNavigation'
import { useCardAnimations } from '@/composables/useAnimations'
import FoundationPile from '../piles/FoundationPile.vue'
import StockPile from '../piles/StockPile.vue'
import TableauPile from '../piles/TableauPile.vue'
import WastePile from '../piles/WastePile.vue'

const props = defineProps<{ state: GameState; hint: Hint | null; generation?: number }>()

const root = ref<HTMLElement | null>(null)
const { onKeydown } = useBoardNavigation(root)
useCardAnimations(
  root,
  () => props.state,
  () => props.generation ?? 0,
)

const stockHinted = computed(() => props.hint?.kind === 'draw' || props.hint?.kind === 'recycle')
</script>

<template>
  <!-- Arrow-key navigation is delegated from the focusable cards and piles inside. -->
  <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -->
  <section
    ref="root"
    class="game-table mx-auto w-fit px-[var(--board-padding)] pt-[var(--board-padding)] pb-16"
    aria-label="Card table"
    @keydown="onKeydown"
  >
    <h2 class="sr-only">Card table</h2>
    <div class="top-row grid grid-cols-7 gap-[var(--pile-gap)]">
      <div class="stock-area contents">
        <StockPile
          :cards="state.stock"
          :waste-count="state.waste.length"
          :draw-count="state.drawCount"
          :hint="stockHinted"
        />
        <WastePile :cards="state.waste" :draw-count="state.drawCount" />
      </div>
      <div aria-hidden="true" />
      <div class="foundation-area contents">
        <FoundationPile
          v-for="(pile, i) in state.foundations"
          :key="`foundation-${i}`"
          :suit="FOUNDATION_SUITS[i]!"
          :index="i"
          :cards="pile"
        />
      </div>
    </div>
    <div
      class="tableau-area mt-[calc(var(--pile-gap)*2.5)] grid grid-cols-7 items-start gap-[var(--pile-gap)]"
    >
      <TableauPile
        v-for="(pile, i) in state.tableau"
        :key="`tableau-${i}`"
        :pile-index="i"
        :cards="pile"
      />
    </div>
  </section>
</template>
