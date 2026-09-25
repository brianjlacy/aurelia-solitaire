<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { Card } from '@/domain/models/Card'
import CardBack from './CardBack.vue'
import CardFront from './CardFront.vue'

export interface CardProps {
  card: Card
  faceUp: boolean
  /** The card can be picked up (drag, tap or keyboard). */
  draggable?: boolean
  position?: 'stacked' | 'fanned'
  offsetIndex?: number
  selected?: boolean
  /** Part of the currently suggested move. */
  hint?: boolean
  /** Shake to signal an invalid move. */
  invalid?: boolean
  /** The original of a card currently being dragged (dimmed). */
  dragging?: boolean
  celebrate?: boolean
  /** Receives clicks and keyboard activation. */
  interactive?: boolean
  /** Roving tab stop: `0` in the tab order, `-1` reachable by arrow keys only. */
  tabbable?: boolean
  /** Rendered in the drag ghost layer. */
  ghost?: boolean
}

const props = withDefaults(defineProps<CardProps>(), {
  draggable: false,
  position: 'stacked',
  offsetIndex: 0,
  selected: false,
  hint: false,
  invalid: false,
  dragging: false,
  celebrate: false,
  interactive: false,
  tabbable: false,
  ghost: false,
})

const emit = defineEmits<{
  (e: 'click', card: Card): void
  (e: 'dblclick', card: Card): void
  (e: 'dragstart', card: Card, event: PointerEvent): void
  (e: 'activate', card: Card): void
}>()

const flipping = ref(false)
let flipTimer: ReturnType<typeof setTimeout> | undefined

watch(
  () => props.faceUp,
  (up, wasUp) => {
    if (up && !wasUp) {
      flipping.value = true
      clearTimeout(flipTimer)
      flipTimer = setTimeout(() => (flipping.value = false), 300)
    }
  },
)

onBeforeUnmount(() => clearTimeout(flipTimer))

const ariaLabel = computed(() => (props.faceUp ? props.card.name : 'Face-down card'))
const isInteractive = computed(() => props.interactive && props.faceUp && !props.ghost)

const cardClasses = computed(() => [
  'card',
  props.faceUp ? 'card--face-up' : 'card--face-down',
  `card--${props.position}`,
  {
    'card--interactive': isInteractive.value && props.draggable,
    'card--selected': props.selected,
    'card--hint': props.hint,
    'card--dragging': props.dragging,
    'card-flip': flipping.value,
    'card-shake': props.invalid,
    'card-celebrate': props.celebrate,
  },
])

const celebrateStyle = computed(() =>
  props.celebrate ? { animationDelay: `${props.offsetIndex * 90}ms` } : undefined,
)

function onClick(): void {
  if (isInteractive.value) emit('click', props.card)
}

function onDblClick(): void {
  if (isInteractive.value) emit('dblclick', props.card)
}

function onPointerDown(event: PointerEvent): void {
  if (isInteractive.value && props.draggable) emit('dragstart', props.card, event)
}

function onActivate(event: KeyboardEvent): void {
  if (!isInteractive.value) return
  event.preventDefault()
  emit('activate', props.card)
}
</script>

<template>
  <div
    :class="cardClasses"
    :style="celebrateStyle"
    :role="isInteractive ? 'button' : 'img'"
    :aria-label="ariaLabel"
    :aria-pressed="isInteractive ? selected : undefined"
    :aria-hidden="ghost || undefined"
    :tabindex="isInteractive ? (tabbable ? 0 : -1) : undefined"
    :data-card-id="ghost ? undefined : card.id"
    :data-ghost-card-id="ghost ? card.id : undefined"
    :data-draggable="draggable ? 'true' : 'false'"
    draggable="false"
    @click="onClick"
    @dblclick="onDblClick"
    @pointerdown="onPointerDown"
    @keydown.enter="onActivate"
    @keydown.space="onActivate"
  >
    <CardFront v-if="faceUp" :card="card" />
    <CardBack v-else />
  </div>
</template>
