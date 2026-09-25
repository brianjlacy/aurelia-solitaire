<script setup lang="ts">
import { computed } from 'vue'
import type { DrawCount } from '@/domain/models/GameState'
import type { PileCards } from '@/domain/models/Pile'
import { Locations } from '@/domain/types/PileType'
import CardComponent from '../cards/CardComponent.vue'
import { useBoardContext } from '../game/boardContext'

const props = defineProps<{ cards: PileCards; drawCount: DrawCount }>()

const board = useBoardContext()
const location = Locations.waste()

/** Draw-three shows the top three cards fanned; draw-one shows the top two stacked. */
const visible = computed(() => {
  const count = props.drawCount === 3 ? 3 : 2
  const start = Math.max(0, props.cards.length - count)
  return props.cards.slice(start).map((placed, i) => ({ placed, index: start + i, slot: i }))
})

const fanned = computed(() => props.drawCount === 3)
const topIndex = computed(() => props.cards.length - 1)
</script>

<template>
  <div class="pile waste-pile" aria-label="Waste" role="group">
    <div v-if="cards.length === 0" class="pile-slot" aria-hidden="true" />
    <CardComponent
      v-for="item in visible"
      :key="item.placed.card.id"
      :card="item.placed.card"
      :face-up="true"
      :position="fanned ? 'fanned' : 'stacked'"
      :offset-index="item.slot"
      :style="fanned ? { left: `calc(var(--card-width) * 0.24 * ${item.slot})` } : undefined"
      :interactive="item.index === topIndex"
      :tabbable="item.index === topIndex"
      :draggable="item.index === topIndex && board.canPickUp(location, item.index)"
      :selected="board.isSelected(location, item.index)"
      :hint="board.isHintSource(location, item.index)"
      :invalid="board.isInvalid(item.placed.card.id)"
      :dragging="board.isCardDragging(item.placed.card.id)"
      :aria-hidden="item.index === topIndex ? undefined : 'true'"
      :data-nav-area="item.index === topIndex ? 'top' : undefined"
      :data-nav-col="item.index === topIndex ? 1 : undefined"
      @click="board.onCardClick(location, item.index)"
      @dblclick="board.onCardDblClick(location, item.index)"
      @activate="board.onCardActivate(location, item.index)"
      @dragstart="
        (_card: unknown, event: PointerEvent) =>
          board.onCardPointerDown(event, location, item.index)
      "
    />
  </div>
</template>
