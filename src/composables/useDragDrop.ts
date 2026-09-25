import { computed, readonly, shallowRef } from 'vue'
import { locationKey, sameLocation, type PileLocation } from '@/domain/types/PileType'
import { useGameStore } from '@/stores/gameStore'
import { useUiStore } from '@/stores/uiStore'

/** Live state of a drag gesture. */
export interface DragState {
  readonly location: PileLocation
  readonly index: number
  readonly cardIds: readonly string[]
  /** Pointer position (viewport coordinates). */
  readonly x: number
  readonly y: number
  /** Pointer offset inside the grabbed card. */
  readonly offsetX: number
  readonly offsetY: number
  readonly width: number
  readonly height: number
  /** Where the drag started, used to animate a cancelled drag back. */
  readonly originX: number
  readonly originY: number
  readonly target: { readonly location: PileLocation; readonly valid: boolean } | null
  readonly phase: 'dragging' | 'returning'
}

interface Pending {
  pointerId: number
  startX: number
  startY: number
  location: PileLocation
  index: number
  element: HTMLElement
}

/** Pixels the pointer must travel before a press becomes a drag. */
export const DRAG_THRESHOLD = 5
/** Duration of the snap-back animation after an invalid drop (ms). */
export const RETURN_DURATION = 200

const drag = shallowRef<DragState | null>(null)
let pending: Pending | null = null
let suppressClickUntil = 0
let returnTimer: ReturnType<typeof setTimeout> | undefined

function parseLocation(value: string | undefined): PileLocation | null {
  const match = /^(stock|waste|foundation|tableau)-(\d+)$/.exec(value ?? '')
  return match ? { type: match[1] as PileLocation['type'], index: Number(match[2]) } : null
}

function overlap(
  a: DOMRect | { left: number; top: number; right: number; bottom: number },
  b: DOMRect,
): number {
  const width = Math.min(a.right, b.right) - Math.max(a.left, b.left)
  const height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
  return width > 0 && height > 0 ? width * height : 0
}

/**
 * Finds the drop target under a dragged card: the pile containing the
 * pointer, otherwise the pile overlapping the dragged card the most.
 */
export function findDropTarget(
  x: number,
  y: number,
  ghost: { left: number; top: number; right: number; bottom: number },
  root: ParentNode = document,
): PileLocation | null {
  let best: { location: PileLocation; score: number } | null = null
  for (const element of root.querySelectorAll<HTMLElement>('[data-drop-target]')) {
    const location = parseLocation(element.dataset.dropTarget)
    if (!location) continue
    const rect = element.getBoundingClientRect()
    const containsPointer = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
    const score = containsPointer ? Number.MAX_SAFE_INTEGER : overlap(ghost, rect)
    if (score > 0 && (!best || score > best.score)) best = { location, score }
  }
  return best?.location ?? null
}

/**
 * Pointer-events drag-and-drop for cards (mouse, touch and pen).
 *
 * A press becomes a drag after {@link DRAG_THRESHOLD} pixels, so clicks and
 * double-clicks keep working. Valid targets are validated live through the
 * game store; invalid drops animate back to where they came from; `Escape`
 * cancels.
 */
export function useDragDrop() {
  const game = useGameStore()
  const ui = useUiStore()

  function computeTarget(state: DragState): DragState['target'] {
    const left = state.x - state.offsetX
    const top = state.y - state.offsetY
    const location = findDropTarget(state.x, state.y, {
      left,
      top,
      right: left + state.width,
      bottom: top + state.height,
    })
    if (!location || sameLocation(location, state.location)) return null
    const valid = game.validate({
      from: state.location,
      cardIndex: state.index,
      to: location,
    }).valid
    return { location, valid }
  }

  function update(x: number, y: number): void {
    const current = drag.value
    if (!current || current.phase !== 'dragging') return
    const moved = { ...current, x, y }
    drag.value = { ...moved, target: computeTarget(moved) }
  }

  function begin(event: PointerEvent): void {
    const p = pending!
    const rect = p.element.getBoundingClientRect()
    const pile = pileCards(p.location)
    ui.clearSelection()
    game.clearHint()
    drag.value = {
      location: p.location,
      index: p.index,
      cardIds: pile.slice(p.index).map((c) => c.card.id),
      x: event.clientX,
      y: event.clientY,
      offsetX: p.startX - rect.left,
      offsetY: p.startY - rect.top,
      width: rect.width,
      height: rect.height,
      originX: p.startX,
      originY: p.startY,
      target: null,
      phase: 'dragging',
    }
  }

  function pileCards(location: PileLocation) {
    const s = game.state
    if (location.type === 'waste') return s.waste
    if (location.type === 'foundation') return s.foundations[location.index] ?? []
    return s.tableau[location.index] ?? []
  }

  function onMove(event: PointerEvent): void {
    if (!pending || event.pointerId !== pending.pointerId) return
    if (!drag.value) {
      const distance = Math.hypot(event.clientX - pending.startX, event.clientY - pending.startY)
      if (distance < DRAG_THRESHOLD) return
      begin(event)
    }
    event.preventDefault()
    update(event.clientX, event.clientY)
  }

  function snapBack(): void {
    const current = drag.value
    if (!current) return
    drag.value = {
      ...current,
      x: current.originX,
      y: current.originY,
      target: null,
      phase: 'returning',
    }
    clearTimeout(returnTimer)
    returnTimer = setTimeout(() => {
      if (drag.value?.phase === 'returning') drag.value = null
    }, RETURN_DURATION)
  }

  function finish(event: PointerEvent): void {
    if (!pending || event.pointerId !== pending.pointerId) return
    const current = drag.value
    detach()
    if (!current) return
    // Swallow the click that follows the pointerup of a drag.
    suppressClickUntil = Date.now() + 50
    update(event.clientX, event.clientY)
    const target = drag.value?.target ?? null
    if (target) {
      const result = game.move({
        from: current.location,
        cardIndex: current.index,
        to: target.location,
      })
      if (result.success) {
        drag.value = null
        return
      }
    }
    snapBack()
  }

  function cancel(): void {
    const hadDrag = drag.value !== null
    detach()
    if (hadDrag) snapBack()
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && drag.value) {
      event.preventDefault()
      event.stopPropagation()
      cancel()
    }
  }

  function attach(): void {
    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', cancel)
    window.addEventListener('keydown', onKeyDown, true)
  }

  function detach(): void {
    pending = null
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', finish)
    window.removeEventListener('pointercancel', cancel)
    window.removeEventListener('keydown', onKeyDown, true)
  }

  /** Call from a card's `pointerdown`. */
  function onPointerDown(event: PointerEvent, location: PileLocation, index: number): void {
    if (event.button !== 0 || drag.value || !game.canPickUp(location, index)) return
    detach()
    pending = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      location,
      index,
      element: event.currentTarget as HTMLElement,
    }
    attach()
  }

  /** True for the click event synthesised right after a drag ends. */
  function shouldSuppressClick(): boolean {
    return Date.now() < suppressClickUntil
  }

  return {
    drag: readonly(drag),
    isDragging: computed(() => drag.value !== null),
    dragTargetKey: computed(() =>
      drag.value?.target ? locationKey(drag.value.target.location) : null,
    ),
    isCardDragging: (cardId: string) => drag.value?.cardIds.includes(cardId) ?? false,
    onPointerDown,
    shouldSuppressClick,
    cancel,
  }
}

/** Test helper: reset module state between tests. */
export function resetDragForTests(): void {
  drag.value = null
  pending = null
  suppressClickUntil = 0
  clearTimeout(returnTimer)
}
