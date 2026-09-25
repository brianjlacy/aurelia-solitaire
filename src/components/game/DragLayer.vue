<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import type { DragState } from '@/composables/useDragDrop'
import type { GameState } from '@/domain/models/GameState'
import { locateCard } from '@/domain/services/GameEngine'
import CardComponent from '../cards/CardComponent.vue'

const props = defineProps<{ drag: DragState | null; state: GameState }>()

const cards = computed(() => {
  if (!props.drag) return []
  const [firstId] = props.drag.cardIds
  const position = firstId ? locateCard(props.state, firstId) : null
  if (!position) return []
  const { location, index } = position
  const pile =
    location.type === 'waste'
      ? props.state.waste
      : location.type === 'foundation'
        ? props.state.foundations[location.index]!
        : props.state.tableau[location.index]!
  return pile.slice(index)
})

const style = computed(() =>
  props.drag
    ? {
        transform: `translate(${props.drag.x - props.drag.offsetX}px, ${props.drag.y - props.drag.offsetY}px)`,
        width: `${props.drag.width}px`,
        height: `${props.drag.height}px`,
      }
    : undefined,
)

watchEffect(() => {
  const body = document.body.classList
  body.toggle('is-dragging', props.drag?.phase === 'dragging')
  body.toggle('is-over-invalid', props.drag?.target?.valid === false)
})
</script>

<template>
  <div
    v-if="drag && cards.length"
    class="drag-layer"
    :class="{
      'drag-layer--returning': drag.phase === 'returning',
      'drag-layer--valid': drag.target?.valid === true,
      'drag-layer--invalid': drag.target?.valid === false,
    }"
    :style="style"
    aria-hidden="true"
  >
    <CardComponent
      v-for="(placed, i) in cards"
      :key="placed.card.id"
      :card="placed.card"
      :face-up="true"
      ghost
      :style="{ top: `calc(var(--tableau-fan-offset) * ${i})` }"
    />
  </div>
</template>
