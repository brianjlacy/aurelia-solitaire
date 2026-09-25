import { watch, type Ref } from 'vue'
import type { GameState } from '@/domain/models/GameState'
import { usePreferredReducedMotion } from '@vueuse/core'

/** Duration of card move animations (ms). */
export const MOVE_DURATION = 220

type Rects = Map<string, DOMRect>

function measure(root: ParentNode): Rects {
  const rects: Rects = new Map()
  for (const el of root.querySelectorAll<HTMLElement>('[data-card-id]')) {
    rects.set(el.dataset.cardId!, el.getBoundingClientRect())
  }
  // A card being dragged should fly from where the ghost is, not its origin.
  for (const el of document.querySelectorAll<HTMLElement>('[data-ghost-card-id]')) {
    rects.set(el.dataset.ghostCardId!, el.getBoundingClientRect())
  }
  return rects
}

/**
 * FLIP animations for cards moving between piles.
 *
 * Positions are measured before the DOM updates (`flush: 'pre'`), then each
 * card that moved is animated from its old position with the Web Animations
 * API. Cards that were hidden in the stock (not rendered individually) fly
 * in from the stock pile. New layouts (a change of `generation`) are not
 * animated. Disabled when the user prefers reduced motion.
 */
export function useCardAnimations(
  root: Ref<HTMLElement | null>,
  source: () => GameState,
  generation: () => number = () => 0,
  stockSelector = '[data-pile-anchor="stock"]',
) {
  const reducedMotion = usePreferredReducedMotion()
  let before: Rects | null = null
  let stockRect: DOMRect | null = null
  let stockIds = new Set<string>()

  const enabled = () => reducedMotion.value !== 'reduce' && root.value !== null

  let lastGeneration = generation()

  watch(
    source,
    (_state, previous) => {
      // A brand-new layout (deal, restart, restore) is not a card move.
      const current = generation()
      const isNewLayout = current !== lastGeneration
      lastGeneration = current
      if (!enabled() || isNewLayout) return
      before = measure(root.value!)
      stockRect = root.value!.querySelector(stockSelector)?.getBoundingClientRect() ?? null
      stockIds = new Set(previous?.stock.map((p) => p.card.id))
    },
    { flush: 'pre' },
  )

  watch(
    source,
    () => {
      if (!before || !enabled()) return
      const previous = before
      before = null
      for (const el of root.value!.querySelectorAll<HTMLElement>('[data-card-id]')) {
        if (typeof el.animate !== 'function') return
        const id = el.dataset.cardId!
        const from = previous.get(id) ?? (stockIds.has(id) ? stockRect : null)
        if (!from) continue
        const to = el.getBoundingClientRect()
        const dx = from.left - to.left
        const dy = from.top - to.top
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue
        el.animate(
          [
            { transform: `translate(${dx}px, ${dy}px)`, zIndex: 1000 },
            { transform: 'translate(0, 0)', zIndex: 1000 },
          ],
          { duration: MOVE_DURATION, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
        )
      }
    },
    { flush: 'post' },
  )
}
