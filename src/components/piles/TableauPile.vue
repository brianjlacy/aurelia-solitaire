<script setup lang="ts">
import { computed } from 'vue'
import type { PileCards } from '@/domain/models/Pile'
import { Locations } from '@/domain/types/PileType'
import CardComponent from '../cards/CardComponent.vue'
import { pileStateClasses, useBoardContext } from '../game/boardContext'

const props = defineProps<{ pileIndex: number; cards: PileCards }>()

const board = useBoardContext()
const location = computed(() => Locations.tableau(props.pileIndex))
const topIndex = computed(() => props.cards.length - 1)

/** Vertical offsets: face-down cards fan tighter than face-up ones. */
const layout = computed(() => {
  let hidden = 0
  let shown = 0
  return props.cards.map((placed, index) => {
    const top = `calc(var(--tableau-fan-offset-hidden) * ${hidden} + var(--tableau-fan-offset) * ${shown})`
    if (placed.faceUp) shown++
    else hidden++
    return { placed, index, top }
  })
})

const height = computed(() => {
  const hidden = props.cards.slice(0, -1).filter((p) => !p.faceUp).length
  const shown = Math.max(0, props.cards.length - 1 - hidden)
  return `calc(var(--card-height) + var(--tableau-fan-offset-hidden) * ${hidden} + var(--tableau-fan-offset) * ${shown})`
})

const label = computed(() => {
  const n = props.cards.length
  if (n === 0) return `Column ${props.pileIndex + 1}, empty`
  const up = props.cards.filter((p) => p.faceUp).length
  return `Column ${props.pileIndex + 1}, ${n} ${n === 1 ? 'card' : 'cards'}, ${up} face up`
})
</script>

<template>
  <div
    class="pile tableau-pile"
    :class="pileStateClasses(board, location)"
    :style="{ height }"
    :data-drop-target="`tableau-${pileIndex}`"
    role="group"
    :aria-label="label"
  >
    <div
      v-if="cards.length === 0"
      class="pile-slot"
      role="button"
      tabindex="0"
      :aria-label="`Empty column ${pileIndex + 1}`"
      data-nav-area="tableau"
      :data-nav-col="pileIndex"
      data-nav-index="-1"
      @click="board.onPileActivate(location)"
      @keydown.enter.prevent="board.onPileActivate(location)"
      @keydown.space.prevent="board.onPileActivate(location)"
    >
      <span aria-hidden="true">K</span>
    </div>
    <CardComponent
      v-for="item in layout"
      :key="item.placed.card.id"
      :card="item.placed.card"
      :face-up="item.placed.faceUp"
      position="fanned"
      :offset-index="item.index"
      :style="{ top: item.top }"
      :interactive="item.placed.faceUp"
      :tabbable="item.index === topIndex"
      :draggable="board.canPickUp(location, item.index)"
      :selected="board.isSelected(location, item.index)"
      :hint="board.isHintSource(location, item.index)"
      :invalid="board.isInvalid(item.placed.card.id)"
      :dragging="board.isCardDragging(item.placed.card.id)"
      :data-nav-area="item.placed.faceUp ? 'tableau' : undefined"
      :data-nav-col="item.placed.faceUp ? pileIndex : undefined"
      :data-nav-index="item.placed.faceUp ? item.index : undefined"
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
