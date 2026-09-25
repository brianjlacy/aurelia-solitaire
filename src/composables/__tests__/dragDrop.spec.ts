import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DRAG_THRESHOLD,
  findDropTarget,
  resetDragForTests,
  RETURN_DURATION,
  useDragDrop,
} from '@/composables/useDragDrop'
import { useGameStore } from '@/stores/gameStore'
import { Locations } from '@/domain/types'
import { layout } from '@/testing/fixtures'
import { setRect, withSetup } from '@/testing/mount'

const pointer = (type: string, x: number, y: number, extra: PointerEventInit = {}) =>
  new PointerEvent(type, {
    clientX: x,
    clientY: y,
    pointerId: 1,
    button: 0,
    bubbles: true,
    cancelable: true,
    ...extra,
  })

function makeTarget(
  key: string,
  rect: { left: number; top: number; width: number; height: number },
) {
  const el = document.createElement('div')
  el.dataset.dropTarget = key
  setRect(el, rect)
  document.body.append(el)
  return el
}

describe('findDropTarget', () => {
  afterEach(() => (document.body.innerHTML = ''))

  it('prefers the pile under the pointer, then the largest overlap', () => {
    makeTarget('tableau-0', { left: 0, top: 0, width: 100, height: 300 })
    makeTarget('tableau-1', { left: 110, top: 0, width: 100, height: 300 })
    makeTarget('bogus', { left: 0, top: 0, width: 1000, height: 1000 })
    const ghost = (left: number) => ({ left, top: 10, right: left + 80, bottom: 122 })
    expect(findDropTarget(150, 50, ghost(0))).toEqual(Locations.tableau(1))
    expect(findDropTarget(-50, 50, ghost(90))).toEqual(Locations.tableau(1))
    expect(findDropTarget(-50, 50, ghost(10))).toEqual(Locations.tableau(0))
    expect(
      findDropTarget(-500, -500, { left: -600, top: -600, right: -520, bottom: -488 }),
    ).toBeNull()
  })
})

describe('useDragDrop', () => {
  let source: HTMLElement

  function setup(state = layout({ tableau: ['KS', '#2C QH', '8D'] })) {
    const ctx = withSetup(() => useDragDrop())
    const game = useGameStore()
    game.loadState(state)
    makeTarget('tableau-0', { left: 0, top: 0, width: 80, height: 300 })
    makeTarget('tableau-1', { left: 100, top: 0, width: 80, height: 300 })
    makeTarget('tableau-2', { left: 200, top: 0, width: 80, height: 300 })
    source = document.createElement('div')
    setRect(source, { left: 100, top: 20, width: 80, height: 112 })
    source.addEventListener('pointerdown', (e) =>
      ctx.result.onPointerDown(e as PointerEvent, Locations.tableau(1), 1),
    )
    document.body.append(source)
    return { ...ctx, game, dnd: ctx.result }
  }

  beforeEach(() => {
    resetDragForTests()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('treats small movements as clicks', () => {
    const { dnd } = setup()
    source.dispatchEvent(pointer('pointerdown', 120, 40))
    window.dispatchEvent(pointer('pointermove', 120 + DRAG_THRESHOLD - 2, 40))
    expect(dnd.isDragging.value).toBe(false)
    window.dispatchEvent(pointer('pointerup', 121, 40))
    expect(dnd.shouldSuppressClick()).toBe(false)
  })

  it('drags onto a valid pile and moves the cards', () => {
    const { dnd, game } = setup()
    source.dispatchEvent(pointer('pointerdown', 120, 40))
    window.dispatchEvent(pointer('pointermove', 90, 60))
    expect(dnd.isDragging.value).toBe(true)
    expect(dnd.drag.value).toMatchObject({ cardIds: ['hearts-12'], offsetX: 20, offsetY: 20 })
    expect(dnd.isCardDragging('hearts-12')).toBe(true)
    window.dispatchEvent(pointer('pointermove', 40, 60))
    expect(dnd.drag.value?.target).toEqual({ location: Locations.tableau(0), valid: true })
    expect(dnd.dragTargetKey.value).toBe('tableau-0')
    window.dispatchEvent(pointer('pointerup', 40, 60))
    expect(dnd.isDragging.value).toBe(false)
    expect(game.state.tableau[0]).toHaveLength(2)
    expect(dnd.shouldSuppressClick()).toBe(true)
  })

  it('snaps back from invalid drops and reports them', () => {
    const { dnd, game } = setup()
    const invalid = vi.fn()
    game.events.on('move:invalid', invalid)
    source.dispatchEvent(pointer('pointerdown', 120, 40))
    window.dispatchEvent(pointer('pointermove', 240, 60))
    expect(dnd.drag.value?.target).toEqual({ location: Locations.tableau(2), valid: false })
    window.dispatchEvent(pointer('pointerup', 240, 60))
    expect(invalid).toHaveBeenCalled()
    expect(dnd.drag.value?.phase).toBe('returning')
    expect(dnd.drag.value).toMatchObject({ x: 120, y: 40 })
    vi.advanceTimersByTime(RETURN_DURATION)
    expect(dnd.drag.value).toBeNull()
  })

  it('snaps back when dropped over nothing or its own pile', () => {
    const { dnd } = setup()
    source.dispatchEvent(pointer('pointerdown', 120, 40))
    window.dispatchEvent(pointer('pointermove', 130, 60))
    expect(dnd.drag.value?.target).toBeNull()
    window.dispatchEvent(pointer('pointermove', 900, 900))
    window.dispatchEvent(pointer('pointerup', 900, 900))
    expect(dnd.drag.value?.phase).toBe('returning')
    // Moves during the return animation are ignored.
    window.dispatchEvent(pointer('pointermove', 10, 10))
    vi.advanceTimersByTime(RETURN_DURATION)
    expect(dnd.drag.value).toBeNull()
  })

  it('cancels with Escape or pointercancel', () => {
    const { dnd } = setup()
    source.dispatchEvent(pointer('pointerdown', 120, 40))
    window.dispatchEvent(pointer('pointermove', 40, 60))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(dnd.drag.value?.phase).toBe('dragging')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }))
    expect(dnd.drag.value?.phase).toBe('returning')
    vi.advanceTimersByTime(RETURN_DURATION)

    source.dispatchEvent(pointer('pointerdown', 120, 40))
    window.dispatchEvent(pointer('pointermove', 40, 60))
    window.dispatchEvent(pointer('pointercancel', 40, 60))
    expect(dnd.drag.value?.phase).toBe('returning')
    vi.advanceTimersByTime(RETURN_DURATION)

    source.dispatchEvent(pointer('pointerdown', 120, 40))
    dnd.cancel()
    expect(dnd.drag.value).toBeNull()
  })

  it('ignores other pointers, buttons and unmovable cards', () => {
    const { dnd, game } = setup()
    source.dispatchEvent(pointer('pointerdown', 120, 40, { button: 2 }))
    window.dispatchEvent(pointer('pointermove', 40, 60))
    expect(dnd.isDragging.value).toBe(false)

    source.dispatchEvent(pointer('pointerdown', 120, 40))
    window.dispatchEvent(pointer('pointermove', 40, 60, { pointerId: 2 }))
    window.dispatchEvent(pointer('pointerup', 40, 60, { pointerId: 2 }))
    expect(dnd.isDragging.value).toBe(false)
    window.dispatchEvent(pointer('pointerup', 120, 40))

    game.loadState(layout({ tableau: ['KS', '#2C'] }))
    source.dispatchEvent(pointer('pointerdown', 120, 40))
    window.dispatchEvent(pointer('pointermove', 40, 60))
    expect(dnd.isDragging.value).toBe(false)
  })

  it('drags from the waste and foundations', () => {
    const { dnd, game } = setup(
      layout({ waste: 'QH', foundationRanks: [1, 0, 0, 0], tableau: ['KS', '2S'] }),
    )
    const waste = document.createElement('div')
    setRect(waste, { left: 100, top: 20, width: 80, height: 112 })
    waste.addEventListener('pointerdown', (e) =>
      dnd.onPointerDown(e as PointerEvent, Locations.waste(), 0),
    )
    document.body.append(waste)
    waste.dispatchEvent(pointer('pointerdown', 120, 40))
    window.dispatchEvent(pointer('pointermove', 40, 60))
    expect(dnd.drag.value?.cardIds).toEqual(['hearts-12'])
    window.dispatchEvent(pointer('pointerup', 40, 60))
    expect(game.state.tableau[0]).toHaveLength(2)

    const foundation = document.createElement('div')
    setRect(foundation, { left: 100, top: 20, width: 80, height: 112 })
    foundation.addEventListener('pointerdown', (e) =>
      dnd.onPointerDown(e as PointerEvent, Locations.foundation(0), 0),
    )
    document.body.append(foundation)
    foundation.dispatchEvent(pointer('pointerdown', 120, 40))
    window.dispatchEvent(pointer('pointermove', 240, 60))
    expect(dnd.drag.value?.cardIds).toEqual(['hearts-1'])
    window.dispatchEvent(pointer('pointerup', 240, 60))
  })

  it('does not start a second drag while one is active', () => {
    const { dnd } = setup()
    source.dispatchEvent(pointer('pointerdown', 120, 40))
    window.dispatchEvent(pointer('pointermove', 40, 60))
    source.dispatchEvent(pointer('pointerdown', 120, 40, { pointerId: 3 }))
    expect(dnd.drag.value?.phase).toBe('dragging')
  })
})
