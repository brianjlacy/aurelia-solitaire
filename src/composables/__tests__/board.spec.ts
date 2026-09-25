import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useBoardController } from '@/composables/useBoardController'
import { useBoardNavigation } from '@/composables/useBoardNavigation'
import { useGameFeedback } from '@/composables/useGameFeedback'
import { useAnnouncer } from '@/composables/useAnnouncer'
import { resetDragForTests } from '@/composables/useDragDrop'
import { useGameStore } from '@/stores/gameStore'
import { useUiStore } from '@/stores/uiStore'
import { Locations } from '@/domain/types'
import { layout, nearWinState } from '@/testing/fixtures'
import { withSetup } from '@/testing/mount'

const T = Locations.tableau
const F = Locations.foundation

describe('useBoardController', () => {
  beforeEach(() => resetDragForTests())

  function setup(
    state = layout({ tableau: ['KS', '#2C QH', '#3D 9C 8H', ''], waste: 'AH', stock: '5S' }),
  ) {
    const { result: board } = withSetup(() => useBoardController())
    const game = useGameStore()
    const ui = useUiStore()
    game.loadState(state)
    return { board, game, ui }
  }

  it('selects a card and moves it on the next click', async () => {
    const { board, game, ui } = setup()
    board.onCardClick(T(1), 1)
    expect(ui.selection).toEqual({ location: T(1), index: 1 })
    expect(board.isSelected(T(1), 1)).toBe(true)
    expect(board.isSelectionTarget(T(0))).toBe(true)
    await nextTick()
    expect(useAnnouncer().announcement.value).toBe(
      'Selected Queen of Hearts. Choose a destination.',
    )
    board.onCardClick(T(0), 0)
    expect(game.state.tableau[0]).toHaveLength(2)
    expect(ui.selection).toBeNull()
  })

  it('announces runs, re-selects within a pile and deselects', async () => {
    const { board, ui } = setup()
    board.onCardActivate(T(2), 1)
    await nextTick()
    expect(useAnnouncer().announcement.value).toBe(
      'Selected 9 of Clubs and 1 card on it. Choose a destination.',
    )
    board.onCardActivate(T(2), 2)
    expect(ui.selection).toEqual({ location: T(2), index: 2 })
    board.onCardActivate(T(2), 2)
    expect(ui.selection).toBeNull()
  })

  it('switches selection to another movable card when the move is invalid', () => {
    const { board, ui } = setup()
    board.onCardClick(T(1), 1)
    board.onCardClick(T(2), 2)
    expect(ui.selection).toEqual({ location: T(2), index: 2 })
  })

  it('reports invalid drops on unmovable targets', () => {
    const { board, game, ui } = setup(
      layout({ tableau: ['KS', 'QH', '#2C'], foundationRanks: [0, 0, 0, 0] }),
    )
    const invalid = vi.fn()
    game.events.on('move:invalid', invalid)
    board.onCardClick(T(1), 0)
    board.onPileActivate(F(1))
    expect(invalid).toHaveBeenCalled()
    expect(ui.selection).toBeNull()
    board.onCardClick(T(1), 0)
    board.onCardClick(T(2), 0)
    expect(invalid).toHaveBeenCalledTimes(2)
  })

  it('ignores clicks on unmovable cards and empty piles without selection', () => {
    const { board, game, ui } = setup()
    board.onCardClick(T(1), 0)
    expect(ui.selection).toBeNull()
    board.onPileActivate(T(3))
    expect(game.moveCount).toBe(0)
  })

  it('drops the selection on an empty pile', () => {
    const { board, game } = setup()
    board.onCardClick(T(0), 0)
    board.onPileActivate(T(3))
    expect(game.state.tableau[3]).toHaveLength(1)
  })

  it('double-clicks top cards to the foundation', async () => {
    const { board, game, ui } = setup()
    board.onCardDblClick(Locations.waste(), 0)
    expect(game.state.foundations[0]).toHaveLength(1)
    board.onCardDblClick(F(0), 0)
    expect(game.state.foundations[0]).toHaveLength(1)
    board.onCardDblClick(T(2), 1)
    expect(ui.invalidCardId).toBe('clubs-9')
    await nextTick()
    expect(useAnnouncer().announcement.value).toBe('Only the top card can go to a foundation.')
  })

  it('draws from the stock and clears selection and hints', () => {
    const { board, game, ui } = setup()
    board.onCardClick(T(1), 1)
    game.hint()
    board.onStockClick()
    expect(ui.selection).toBeNull()
    expect(game.activeHint).toBeNull()
    expect(game.state.waste).toHaveLength(2)
  })

  it('reports hint sources and targets', () => {
    const { board, game } = setup(nearWinState())
    game.hint()
    expect(board.isHintSource(T(0), 0)).toBe(true)
    expect(board.isHintSource(T(1), 0)).toBe(false)
    expect(board.isHintTarget(F(3))).toBe(true)
    expect(board.isHintTarget(F(2))).toBe(false)
    game.clearHint()
    expect(board.isHintSource(T(0), 0)).toBe(false)
    expect(board.isHintTarget(F(3))).toBe(false)
  })

  it('exposes pick-up, invalid, dragging, drop and celebration state', () => {
    const { board, game, ui } = setup(nearWinState())
    expect(board.canPickUp(T(0), 0)).toBe(true)
    ui.flashInvalid('clubs-13')
    expect(board.isInvalid('clubs-13')).toBe(true)
    expect(board.isCardDragging('clubs-13')).toBe(false)
    expect(board.dropState(F(3))).toBeNull()
    expect(board.celebrating).toBe(false)
    game.autoMove(T(0))
    expect(board.celebrating).toBe(true)
  })

  it('forwards pointer downs to drag-and-drop', () => {
    const { board } = setup()
    const event = new PointerEvent('pointerdown', { button: 2 })
    expect(() => board.onCardPointerDown(event, T(0), 0)).not.toThrow()
  })
})

describe('useBoardNavigation', () => {
  afterEach(() => (document.body.innerHTML = ''))

  function setup() {
    const Comp = defineComponent({
      setup() {
        const root = ref<HTMLElement | null>(null)
        const { onKeydown } = useBoardNavigation(root)
        const item = (area: string, col: number, index: number | null, tab: number, id: string) =>
          h('button', {
            id,
            tabindex: tab,
            'data-nav-area': area,
            'data-nav-col': col,
            'data-nav-index': index ?? undefined,
          })
        return () =>
          h('div', { ref: root, onKeydown }, [
            item('top', 0, null, 0, 'stock'),
            item('top', 1, null, 0, 'waste'),
            item('top', 3, null, 0, 'f0'),
            item('top', 6, null, 0, 'f3'),
            item('tableau', 0, 0, 0, 't0'),
            item('tableau', 1, 1, -1, 't1a'),
            item('tableau', 1, 2, 0, 't1b'),
            item('tableau', 2, -1, 0, 't2'),
          ])
      },
    })
    mount(Comp, { attachTo: document.body })
    const press = (key: string) => {
      document.activeElement!.dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
      )
      return document.activeElement!.id
    }
    const focus = (id: string) => document.getElementById(id)!.focus()
    return { press, focus }
  }

  it('moves between columns and rows', () => {
    const { press, focus } = setup()
    focus('stock')
    expect(press('ArrowRight')).toBe('waste')
    expect(press('ArrowRight')).toBe('f0')
    expect(press('ArrowLeft')).toBe('waste')
    expect(press('ArrowDown')).toBe('t1b')
    expect(press('ArrowUp')).toBe('t1a')
    expect(press('ArrowDown')).toBe('t1b')
    expect(press('ArrowDown')).toBe('t1b')
    expect(press('ArrowRight')).toBe('t2')
    expect(press('ArrowRight')).toBe('t2')
    expect(press('Home')).toBe('t0')
    expect(press('End')).toBe('t2')
    expect(press('ArrowUp')).toBe('waste')
    expect(press('ArrowUp')).toBe('waste')
    focus('t0')
    expect(press('ArrowLeft')).toBe('t0')
    expect(press('ArrowUp')).toBe('stock')
  })

  it('ignores other keys and unfocused boards', () => {
    const { press, focus } = setup()
    focus('stock')
    expect(press('a')).toBe('stock')
    ;(document.activeElement as HTMLElement).blur()
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(document.activeElement).toBe(document.body)
  })

  it('handles a missing root', () => {
    const root = ref<HTMLElement | null>(null)
    const { onKeydown } = useBoardNavigation(root)
    expect(() => onKeydown(new KeyboardEvent('keydown', { key: 'ArrowRight' }))).not.toThrow()
  })
})

describe('useGameFeedback', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })
  afterEach(() => vi.useRealTimers())

  it('announces events, flashes invalid moves and opens the win dialog', async () => {
    const { wrapper } = withSetup(() => useGameFeedback({ winDialogDelayMs: 100 }))
    const game = useGameStore()
    const ui = useUiStore()
    const { announcement } = useAnnouncer()

    game.newGame()
    await nextTick()
    expect(announcement.value).toMatch(/New game dealt/)

    game.loadState(layout({ stock: 'AH', tableau: ['#2C KH', ''] }))
    game.drawFromStock()
    await nextTick()
    expect(announcement.value).toMatch(/Drew 1 card/)

    game.move({ from: T(0), cardIndex: 1, to: T(1) })
    await nextTick()
    expect(announcement.value).toMatch(/Revealed 2 of Clubs/)

    game.move({ from: T(0), cardIndex: 0, to: T(1) })
    await nextTick()
    expect(announcement.value).toMatch(/^Invalid move/)
    expect(ui.invalidCardId).toBe('clubs-2')

    ui.select(T(1), 0)
    game.undo()
    await nextTick()
    expect(ui.selection).toBeNull()
    expect(announcement.value).toMatch(/^Undone/)

    game.hint()
    await nextTick()
    expect(announcement.value).toMatch(/^Hint/)

    game.loadState(nearWinState())
    game.move({ from: T(0), cardIndex: 0, to: F(3) })
    await nextTick()
    expect(announcement.value).toBe('You won! Congratulations!')
    expect(ui.modal).toBeNull()
    vi.advanceTimersByTime(100)
    expect(ui.modal).toBe('win')

    wrapper.unmount()
  })

  it('does not replay the shuffle for restored games and cleans up', async () => {
    const { wrapper } = withSetup(() => useGameFeedback())
    const game = useGameStore()
    game.newGame()
    game.drawFromStock()
    game.pause()
    setActivePinia(createPinia())
    wrapper.unmount()
    const again = withSetup(() => useGameFeedback())
    const restored = useGameStore()
    restored.init()
    await nextTick()
    expect(useAnnouncer().announcement.value).toMatch(/restored/)
    again.wrapper.unmount()
  })
})
