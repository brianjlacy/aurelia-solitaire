<script setup lang="ts">
import { computed } from 'vue'
import type { PileCards } from '@/domain/models/Pile'
import { Locations } from '@/domain/types/PileType'
import { SUIT_NAMES, SUIT_SYMBOLS, type Suit } from '@/domain/types/Suit'
import CardComponent from '../cards/CardComponent.vue'
import { pileStateClasses, useBoardContext } from '../game/boardContext'

const props = defineProps<{ suit: Suit; index: number; cards: PileCards }>()

const board = useBoardContext()
const location = computed(() => Locations.foundation(props.index))

/** Only the top two cards are rendered: the top and the one it reveals when moved. */
const visible = computed(() => {
  const start = Math.max(0, props.cards.length - 2)
  return props.cards.slice(start).map((placed, i) => ({ placed, index: start + i }))
})
const topIndex = computed(() => props.cards.length - 1)
const suitName = computed(() => SUIT_NAMES[props.suit])
</script>

<template>
  <div
    class="pile foundation-pile"
    :class="pileStateClasses(board, location)"
    :data-drop-target="`foundation-${index}`"
    role="group"
    :aria-label="`${suitName} foundation, ${cards.length} of 13`"
  >
    <div
      v-if="cards.length === 0"
      class="pile-slot"
      role="button"
      tabindex="0"
      :aria-label="`Empty foundation pile for ${suitName}`"
      data-nav-area="top"
      :data-nav-col="3 + index"
      @click="board.onPileActivate(location)"
      @keydown.enter.prevent="board.onPileActivate(location)"
      @keydown.space.prevent="board.onPileActivate(location)"
    >
      <span aria-hidden="true">{{ SUIT_SYMBOLS[suit] }}</span>
    </div>
    <div v-else class="pile-slot" aria-hidden="true">{{ SUIT_SYMBOLS[suit] }}</div>
    <CardComponent
      v-for="item in visible"
      :key="item.placed.card.id"
      :card="item.placed.card"
      :face-up="true"
      :offset-index="index"
      :interactive="item.index === topIndex"
      :tabbable="item.index === topIndex"
      :draggable="item.index === topIndex && board.canPickUp(location, item.index)"
      :selected="board.isSelected(location, item.index)"
      :invalid="board.isInvalid(item.placed.card.id)"
      :dragging="board.isCardDragging(item.placed.card.id)"
      :celebrate="board.celebrating && item.index === topIndex"
      :aria-hidden="item.index === topIndex ? undefined : 'true'"
      :data-nav-area="item.index === topIndex ? 'top' : undefined"
      :data-nav-col="item.index === topIndex ? 3 + index : undefined"
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
