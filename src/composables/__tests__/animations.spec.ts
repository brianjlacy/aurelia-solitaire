import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { useCardAnimations } from '@/composables/useAnimations'
import type { GameState } from '@/domain/models/GameState'
import { layout } from '@/testing/fixtures'
import { setRect } from '@/testing/mount'

/** Renders tableau cards at x = column * 100 so layout changes are measurable. */
function setup(initial: GameState) {
  const state = ref(initial)
  const generation = ref(0)
  const animate = vi.fn()
  const Comp = defineComponent({
    setup() {
      const root = ref<HTMLElement | null>(null)
      useCardAnimations(
        root,
        () => state.value,
        () => generation.value,
      )
      return () =>
        h('div', { ref: root }, [
          h('div', {
            'data-pile-anchor': 'stock',
            ref: (el) => el && setRect(el as Element, { left: 500, top: 0, width: 10, height: 10 }),
          }),
          ...state.value.tableau.flatMap((pile, column) =>
            pile.map((p) =>
              h('div', {
                key: p.card.id,
                'data-card-id': p.card.id,
                'data-x': column * 100,
                ref: (el) => {
                  if (!el) return
                  const element = el as HTMLElement
                  element.getBoundingClientRect = () =>
                    ({ left: Number(element.dataset.x), top: 0, width: 10, height: 10 }) as DOMRect
                  if (!('noAnimate' in element.dataset)) element.animate = animate
                },
              }),
            ),
          ),
        ])
    },
  })
  const wrapper = mount(Comp, { attachTo: document.body })
  return { state, generation, animate, wrapper }
}

async function flush() {
  await nextTick()
  await nextTick()
}

describe('useCardAnimations', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    vi.unstubAllGlobals()
  })

  it('animates moved cards from their previous position', async () => {
    const { state, animate } = setup(layout({ tableau: ['KS', 'QH'] }))
    state.value = layout({ tableau: ['KS QH', ''] })
    await flush()
    expect(animate).toHaveBeenCalledTimes(1)
    expect(animate.mock.calls[0]![0][0].transform).toBe('translate(100px, 0px)')
  })

  it('flies cards in from the stock', async () => {
    const { state, animate } = setup(layout({ stock: 'QH', tableau: ['KS'] }))
    state.value = layout({ tableau: ['KS', 'QH'] })
    await flush()
    expect(animate).toHaveBeenCalledTimes(1)
    expect(animate.mock.calls[0]![0][0].transform).toBe('translate(400px, 0px)')
  })

  it('ignores cards that appear from elsewhere', async () => {
    const { state, animate } = setup(layout({ tableau: ['KS'] }))
    state.value = layout({ tableau: ['KS', 'QH'] })
    await flush()
    expect(animate).not.toHaveBeenCalled()
  })

  it('skips new layouts and starts from the drag ghost', async () => {
    const { state, generation, animate } = setup(layout({ tableau: ['KS', 'QH'] }))
    generation.value = 1
    state.value = layout({ tableau: ['KS QH'] })
    await flush()
    expect(animate).not.toHaveBeenCalled()

    const ghost = document.createElement('div')
    ghost.dataset.ghostCardId = 'hearts-12'
    setRect(ghost, { left: 40, top: 0, width: 10, height: 10 })
    document.body.append(ghost)
    state.value = layout({ tableau: ['KS', 'QH'] })
    await flush()
    expect(animate).toHaveBeenCalledTimes(1)
    expect(animate.mock.calls[0]![0][0].transform).toBe('translate(-60px, 0px)')
  })

  it('does nothing when reduced motion is preferred', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('reduce'),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }))
    const { state, animate } = setup(layout({ tableau: ['KS', 'QH'] }))
    state.value = layout({ tableau: ['KS QH'] })
    await flush()
    expect(animate).not.toHaveBeenCalled()
  })

  it('stops when the Web Animations API is unavailable', async () => {
    const { state, animate } = setup(layout({ tableau: ['KS', 'QH'] }))
    for (const el of document.querySelectorAll<HTMLElement>('[data-card-id]')) {
      el.dataset.noAnimate = ''
      ;(el as { animate?: unknown }).animate = undefined
    }
    state.value = layout({ tableau: ['KS QH'] })
    await flush()
    expect(animate).not.toHaveBeenCalled()
  })
})
