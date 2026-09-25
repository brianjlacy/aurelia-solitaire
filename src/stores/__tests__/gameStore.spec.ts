import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { GAME_STORAGE_KEY, useGameStore } from '@/stores/gameStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useStatsStore } from '@/stores/statsStore'
import { Locations } from '@/domain/types'
import { Card } from '@/domain/models/Card'
import { Rank, Suit } from '@/domain/types'
import { aceReadyState, autoCompleteState, card, layout, nearWinState } from '@/testing/fixtures'
import { allPlacedCards } from '@/domain/models/GameState'

const T = Locations.tableau
const F = Locations.foundation

describe('gameStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  describe('newGame', () => {
    it('should initialize new game correctly', () => {
      const store = useGameStore()
      store.newGame()
      expect(store.state.tableau).toHaveLength(7)
      expect(store.state.tableau[0]).toHaveLength(1)
      expect(store.state.tableau[6]).toHaveLength(7)
      expect(store.state.stock).toHaveLength(24)
      expect(store.moveCount).toBe(0)
      expect(store.elapsedMs).toBe(0)
      expect(store.isPlaying).toBe(true)
      expect(store.canUndo).toBe(false)
      expect(allPlacedCards(store.state)).toHaveLength(52)
    })

    it('uses the draw-count setting and seeds', () => {
      useSettingsStore().update({ drawCount: 1 })
      const store = useGameStore()
      store.newGame({ seed: 5 })
      expect(store.state.drawCount).toBe(1)
      expect(store.state.seed).toBe(5)
      const first = store.state
      store.newGame({ seed: 5, drawCount: 3 })
      expect(store.state.tableau).toEqual(first.tableau)
      expect(store.state.drawCount).toBe(3)
    })

    it('records an abandoned started game as a loss', () => {
      const store = useGameStore()
      const stats = useStatsStore()
      store.newGame()
      store.newGame()
      expect(stats.stats.gamesPlayed).toBe(0)
      store.drawFromStock()
      expect(stats.stats.gamesPlayed).toBe(1)
      vi.advanceTimersByTime(5000)
      store.newGame()
      expect(stats.stats.currentStreak).toBe(0)
      expect(stats.stats.totalPlayTimeMs).toBe(5000)
    })

    it('emits game:new', () => {
      const store = useGameStore()
      const handler = vi.fn()
      store.events.on('game:new', handler)
      store.newGame({ drawCount: 1 })
      expect(handler).toHaveBeenCalledWith({
        message: 'New game dealt. Draw one.',
        restored: false,
      })
    })

    it('restarts the same deal', () => {
      const store = useGameStore()
      store.newGame()
      const initial = store.state
      store.drawFromStock()
      store.restartGame()
      expect(store.state).toBe(initial)
      expect(store.canUndo).toBe(false)
    })

    it('deals when restarting without a deal', () => {
      const store = useGameStore()
      store.restartGame()
      expect(store.state.stock).toHaveLength(24)
    })
  })

  describe('moves', () => {
    it('should execute valid move and increment counter', () => {
      const store = useGameStore()
      store.loadState(aceReadyState())
      const result = store.moveCard(card('AS'), F(2))
      expect(result).toEqual({
        success: true,
        message: 'Moved card: Ace of Spades to the Spades foundation.',
      })
      expect(store.moveCount).toBe(1)
      expect(store.canUndo).toBe(true)
      expect(store.isTimerRunning).toBe(true)
    })

    it('should reject invalid move', () => {
      const store = useGameStore()
      store.loadState(aceReadyState())
      const invalid = vi.fn()
      store.events.on('move:invalid', invalid)
      const result = store.moveCard(card('5C'), T(4))
      expect(result.success).toBe(false)
      if (!result.success) expect(result.reason).toBeDefined()
      expect(store.moveCount).toBe(0)
      expect(invalid).toHaveBeenCalledWith({ reason: expect.any(String), cardId: 'clubs-5' })
    })

    it('rejects cards that are not on the table', () => {
      const store = useGameStore()
      store.loadState(layout({ tableau: ['AS'] }))
      const result = store.moveCard(new Card(Suit.Hearts, Rank.Two), T(1))
      expect(result).toEqual({ success: false, reason: '2 of Hearts is not on the table.' })
    })

    it('moves by location and emits cards:moved with reveals', () => {
      const store = useGameStore()
      store.loadState(layout({ tableau: ['#2C KH', ''] }))
      const moved = vi.fn()
      store.events.on('cards:moved', moved)
      store.move({ from: T(0), cardIndex: 1, to: T(1) })
      expect(moved).toHaveBeenCalledWith(
        expect.objectContaining({ revealed: card('2C'), toFoundation: false }),
      )
      expect(store.state.tableau[0]![0]!.faceUp).toBe(true)
    })

    it('draws and recycles', () => {
      const store = useGameStore()
      store.loadState(layout({ stock: 'AH 2H' }))
      const drawn = vi.fn()
      store.events.on('cards:drawn', drawn)
      expect(store.canDraw).toBe(true)
      store.drawFromStock()
      expect(store.state.waste).toHaveLength(2)
      store.drawFromStock()
      expect(store.state.stock).toHaveLength(2)
      expect(drawn).toHaveBeenLastCalledWith(expect.objectContaining({ recycled: true }))
    })

    it('auto-moves to the foundation', () => {
      const store = useGameStore()
      store.loadState(aceReadyState())
      expect(store.autoMove(T(0)).success).toBe(true)
      expect(store.state.foundations[2]).toHaveLength(1)
      const invalid = vi.fn()
      store.events.on('move:invalid', invalid)
      expect(store.autoMove(T(1)).success).toBe(false)
      expect(invalid).toHaveBeenCalledWith({
        reason: '5 of Clubs cannot go to a foundation yet.',
        cardId: 'clubs-5',
      })
    })

    it('exposes pick-up and validation helpers', () => {
      const store = useGameStore()
      store.loadState(aceReadyState())
      expect(store.canPickUp(T(0), 0)).toBe(true)
      expect(store.canPickUp(T(1), 0)).toBe(false)
      expect(store.validate({ from: T(0), cardIndex: 0, to: F(2) })).toEqual({ valid: true })
    })
  })

  describe('undo/redo', () => {
    it('should undo and redo moves correctly', () => {
      const store = useGameStore()
      store.loadState(aceReadyState())
      const initialState = structuredClone(store.state)
      store.moveCard(card('AS'), F(2))
      const afterMoveState = structuredClone(store.state)

      const changed = vi.fn()
      store.events.on('history:changed', changed)
      expect(store.undo()).toBe(true)
      expect(store.state).toEqual(initialState)
      expect(store.canRedo).toBe(true)
      expect(changed).toHaveBeenLastCalledWith({
        direction: 'undo',
        message: 'Undone. Moved card: Ace of Spades to the Spades foundation.',
      })

      expect(store.redo()).toBe(true)
      expect(store.state).toEqual(afterMoveState)
      expect(store.canRedo).toBe(false)
    })

    it('does nothing without history', () => {
      const store = useGameStore()
      store.newGame()
      expect(store.undo()).toBe(false)
      expect(store.redo()).toBe(false)
    })

    it('clears redo on a new move and history on a new game', () => {
      const store = useGameStore()
      store.loadState(layout({ stock: 'AH 2H 3H 4H 5H 6H', drawCount: 1 }))
      store.drawFromStock()
      store.drawFromStock()
      store.undo()
      store.drawFromStock()
      expect(store.canRedo).toBe(false)
      store.newGame()
      expect(store.canUndo).toBe(false)
    })

    it('locks history once the game is won', () => {
      const store = useGameStore()
      store.loadState(nearWinState())
      store.move({ from: T(0), cardIndex: 0, to: F(3) })
      expect(store.hasWon).toBe(true)
      expect(store.canUndo).toBe(false)
    })

    it('redoes a move and continues to a win', () => {
      const store = useGameStore()
      store.loadState(layout({ foundationRanks: [13, 13, 13, 11], tableau: ['KC QC'] }))
      store.move({ from: T(0), cardIndex: 1, to: F(3) })
      store.undo()
      store.redo()
      expect(store.hasWon).toBe(false)
      store.move({ from: T(0), cardIndex: 0, to: F(3) })
      expect(store.hasWon).toBe(true)
    })
  })

  describe('winning', () => {
    it('detects the win, stops the clock and records statistics', () => {
      const store = useGameStore()
      const stats = useStatsStore()
      store.loadState(nearWinState())
      const won = vi.fn()
      store.events.on('game:won', won)
      store.move({ from: T(0), cardIndex: 0, to: F(3) })
      expect(store.hasWon).toBe(true)
      expect(store.isTimerRunning).toBe(false)
      expect(won).toHaveBeenCalledWith({
        moves: 100,
        timeMs: 0,
        message: 'You won! Congratulations!',
      })
      expect(stats.stats).toMatchObject({
        gamesPlayed: 1,
        gamesWon: 1,
        currentStreak: 1,
        fewestMoves: 100,
      })
      expect(localStorage.getItem(GAME_STORAGE_KEY)).toBeNull()
      // A won game is not counted as a loss when the next one starts.
      store.newGame()
      expect(stats.stats.currentStreak).toBe(1)
    })

    it('auto-completes a solved board', async () => {
      const store = useGameStore()
      store.loadState(autoCompleteState())
      expect(store.canAutoComplete).toBe(true)
      const pending = store.autoComplete(10)
      expect(store.autoCompleting).toBe(true)
      expect(store.canAutoComplete).toBe(false)
      await vi.runAllTimersAsync()
      await pending
      expect(store.hasWon).toBe(true)
      expect(store.autoCompleting).toBe(false)
    })

    it('auto-completes synchronously with no delay and ignores unsolved boards', async () => {
      const store = useGameStore()
      store.loadState(autoCompleteState())
      await store.autoComplete(0)
      expect(store.hasWon).toBe(true)
      store.loadState(aceReadyState())
      await store.autoComplete(0)
      expect(store.moveCount).toBe(0)
    })

    it('stops auto-completing when a new game starts', async () => {
      const store = useGameStore()
      store.loadState(autoCompleteState())
      const pending = store.autoComplete(50)
      store.newGame()
      await vi.runAllTimersAsync()
      await pending
      expect(store.moveCount).toBe(0)
    })
  })

  describe('timer', () => {
    it('starts on the first action and tracks elapsed time', () => {
      const store = useGameStore()
      store.newGame()
      expect(store.isTimerRunning).toBe(false)
      store.drawFromStock()
      vi.advanceTimersByTime(3000)
      store.tick()
      expect(store.elapsedMs).toBe(3000)
      store.tick(Date.now() + 1000)
      expect(store.elapsedMs).toBe(4000)
    })

    it('pauses and resumes', () => {
      const store = useGameStore()
      store.newGame()
      store.resume()
      expect(store.isTimerRunning).toBe(false)
      store.drawFromStock()
      vi.advanceTimersByTime(2000)
      store.pause()
      store.pause()
      vi.advanceTimersByTime(10_000)
      store.tick()
      expect(store.elapsedMs).toBe(2000)
      store.resume()
      vi.advanceTimersByTime(1000)
      store.tick()
      expect(store.elapsedMs).toBe(3000)
    })
  })

  describe('hints', () => {
    it('highlights the best move and clears after a move', () => {
      const store = useGameStore()
      store.loadState(aceReadyState())
      const handler = vi.fn()
      store.events.on('hint', handler)
      const hint = store.hint()
      expect(hint?.kind).toBe('foundation')
      expect(store.activeHint).toEqual(hint)
      expect(store.hintsUsed).toBe(1)
      expect(handler).toHaveBeenCalledWith({
        hint,
        message: 'Hint: Move Ace of Spades to the foundation.',
      })
      store.autoMove(T(0))
      expect(store.activeHint).toBeNull()
      store.hint()
      store.clearHint()
      expect(store.activeHint).toBeNull()
    })

    it('respects the hint limit', () => {
      useSettingsStore().update({ hintLimit: 3 })
      const store = useGameStore()
      store.loadState(aceReadyState())
      expect(store.hintsRemaining).toBe(3)
      store.hint()
      store.hint()
      store.hint()
      expect(store.hintsRemaining).toBe(0)
      const handler = vi.fn()
      store.events.on('hint', handler)
      expect(store.hint()).toBeNull()
      expect(handler).toHaveBeenCalledWith({ hint: null, message: 'No hints left for this game.' })
    })

    it('reports when no moves exist and ignores finished games', () => {
      const store = useGameStore()
      store.loadState(layout({ tableau: ['KH'] }))
      const handler = vi.fn()
      store.events.on('hint', handler)
      expect(store.hint()).toBeNull()
      expect(handler).toHaveBeenCalledWith({
        hint: null,
        message: 'No moves available. Try starting a new game.',
      })
      expect(store.hintsUsed).toBe(0)
      store.loadState({ ...nearWinState(), status: 'won' })
      expect(store.hint()).toBeNull()
    })
  })

  describe('persistence', () => {
    it('saves progress and restores it on init', () => {
      const store = useGameStore()
      store.newGame({ seed: 9 })
      store.drawFromStock()
      vi.advanceTimersByTime(4000)
      store.pause()
      const saved = store.state

      setActivePinia(createPinia())
      const restored = useGameStore()
      const handler = vi.fn()
      restored.events.on('game:new', handler)
      restored.init()
      expect(restored.state).toEqual(saved)
      expect(restored.elapsedMs).toBe(4000)
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ restored: true }))
      restored.restartGame()
      expect(restored.state.stock).toHaveLength(24)
      expect(restored.state.waste).toHaveLength(0)
    })

    it('restores games saved without an initial deal', () => {
      const store = useGameStore()
      store.newGame()
      const raw = JSON.parse(localStorage.getItem(GAME_STORAGE_KEY)!)
      raw.data.initial = null
      localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(raw))
      setActivePinia(createPinia())
      const restored = useGameStore()
      restored.init()
      expect(restored.state.stock).toHaveLength(24)
    })

    it('deals a new game when a seed is requested or nothing is saved', () => {
      const store = useGameStore()
      store.init()
      expect(store.state.stock).toHaveLength(24)
      store.drawFromStock()
      setActivePinia(createPinia())
      const seeded = useGameStore()
      seeded.init({ seed: 3 })
      expect(seeded.state.seed).toBe(3)
      expect(seeded.moveCount).toBe(0)
    })

    it.each([
      ['non-object', 'x'],
      ['bad state', { state: {}, initial: null, elapsedMs: 0, counted: false, hintsUsed: 0 }],
      ['bad initial', 'initial'],
      ['bad elapsed', 'elapsed'],
      ['bad counted', 'counted'],
    ])('ignores invalid saved games (%s)', (_label, variant) => {
      const store = useGameStore()
      store.newGame()
      const raw = JSON.parse(localStorage.getItem(GAME_STORAGE_KEY)!)
      if (variant === 'initial') raw.data.initial = { nope: true }
      else if (variant === 'elapsed') raw.data.elapsedMs = -1
      else if (variant === 'counted') raw.data.counted = 'yes'
      else raw.data = variant
      localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(raw))
      setActivePinia(createPinia())
      const next = useGameStore()
      const handler = vi.fn()
      next.events.on('game:new', handler)
      next.init()
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ restored: false }))
    })
  })
})
