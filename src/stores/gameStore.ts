import { defineStore } from 'pinia'
import { computed, markRaw, ref, shallowRef } from 'vue'
import type { Card } from '@/domain/models/Card'
import { emptyGameState, type DrawCount, type GameState } from '@/domain/models/GameState'
import type { Move } from '@/domain/types/Move'
import type { PileLocation } from '@/domain/types/PileType'
import { GameBuilder } from '@/domain/builders/GameBuilder'
import { CommandHistory } from '@/domain/commands/CommandHistory'
import { MoveCommand } from '@/domain/commands/MoveCommand'
import {
  autoMoveToFoundation as engineAutoMove,
  canAutoComplete as engineCanAutoComplete,
  canDraw as engineCanDraw,
  canPickUp as engineCanPickUp,
  draw as engineDraw,
  locateCard,
  moveCards as engineMoveCards,
  nextAutoCompleteMove,
  type EngineResult,
} from '@/domain/services/GameEngine'
import { getBestHint, type Hint } from '@/domain/services/HintService'
import { MoveValidator, pileAt } from '@/domain/services/MoveValidator'
import {
  deserializeGameState,
  serializeGameState,
  type SerializedGameState,
} from '@/domain/services/Serializer'
import { createEventBus } from '@/utils/eventBus'
import {
  isNonNegativeInteger,
  isNonNegativeNumber,
  isRecord,
  PersistedValue,
} from '@/utils/storage'
import { describeResult } from './describe'
import { useSettingsStore } from './settingsStore'
import { useStatsStore } from './statsStore'

/** Result of a player command. */
export type MoveResult = { success: true; message: string } | { success: false; reason: string }

/** Events published by the game store (consumed by audio, announcer, animations). */
export interface GameEvents {
  'game:new': { message: string; restored: boolean }
  'game:won': { moves: number; timeMs: number; message: string }
  'cards:drawn': { cards: readonly Card[]; recycled: boolean; message: string }
  'cards:moved': {
    cards: readonly Card[]
    move: Move
    revealed?: Card
    toFoundation: boolean
    message: string
  }
  'move:invalid': { reason: string; cardId?: string }
  'history:changed': { direction: 'undo' | 'redo'; message: string }
  hint: { hint: Hint | null; message: string }
}

interface SavedGame {
  state: SerializedGameState
  initial: SerializedGameState | null
  elapsedMs: number
  counted: boolean
  hintsUsed: number
}

export const GAME_STORAGE_KEY = 'solitaire-game'

function validateSavedGame(data: unknown): SavedGame | null {
  if (!isRecord(data)) return null
  const state = deserializeGameState(data.state)
  if (!state || state.status !== 'playing') return null
  if (data.initial !== null && !deserializeGameState(data.initial)) return null
  if (!isNonNegativeNumber(data.elapsedMs) || !isNonNegativeInteger(data.hintsUsed)) return null
  if (typeof data.counted !== 'boolean') return null
  return data as unknown as SavedGame
}

export interface NewGameOptions {
  seed?: number | null
  drawCount?: DrawCount
}

/**
 * The game session: current table, undo/redo history, timer, hints and
 * persistence. All rule enforcement is delegated to the domain engine; the
 * table itself is an immutable snapshot exposed read-only.
 */
export const useGameStore = defineStore('game', () => {
  const settings = useSettingsStore()
  const stats = useStatsStore()
  const events = markRaw(createEventBus<GameEvents>())
  const history = markRaw(new CommandHistory<GameState>())
  const persisted = markRaw(
    new PersistedValue<SavedGame>({
      key: GAME_STORAGE_KEY,
      version: 1,
      validate: validateSavedGame,
    }),
  )

  const state = shallowRef<GameState>(emptyGameState(settings.drawCount))
  const initialState = shallowRef<GameState | null>(null)
  const historyVersion = ref(0)
  const counted = ref(false)
  const hintsUsed = ref(0)
  const activeHint = shallowRef<Hint | null>(null)
  const autoCompleting = ref(false)
  /** Incremented whenever a whole new layout is loaded (deal, restart, restore). */
  const generation = ref(0)

  // Timer: accumulated time plus the currently running segment.
  const accumulatedMs = ref(0)
  const runningSince = ref<number | null>(null)
  const now = ref(Date.now())

  // ── Getters ────────────────────────────────────────────────────────────
  const elapsedMs = computed(
    () =>
      accumulatedMs.value +
      (runningSince.value === null ? 0 : Math.max(0, now.value - runningSince.value)),
  )
  const isPlaying = computed(() => state.value.status === 'playing')
  const hasWon = computed(() => state.value.status === 'won')
  const canUndo = computed(() => (historyVersion.value, history.canUndo && isPlaying.value))
  const canRedo = computed(() => (historyVersion.value, history.canRedo && isPlaying.value))
  const canDraw = computed(() => engineCanDraw(state.value))
  const canAutoComplete = computed(
    () => !autoCompleting.value && engineCanAutoComplete(state.value),
  )
  const hintsRemaining = computed(() =>
    settings.hintLimit === 0 ? null : Math.max(0, settings.hintLimit - hintsUsed.value),
  )
  const isTimerRunning = computed(() => runningSince.value !== null)

  // ── Timer ──────────────────────────────────────────────────────────────
  function tick(time = Date.now()): void {
    now.value = time
  }

  function startTimer(): void {
    if (runningSince.value !== null) return
    const time = Date.now()
    now.value = time
    runningSince.value = time
  }

  function stopTimer(): void {
    if (runningSince.value === null) return
    const time = Date.now()
    accumulatedMs.value += Math.max(0, time - runningSince.value)
    runningSince.value = null
    now.value = time
  }

  function resetTimer(ms = 0): void {
    accumulatedMs.value = ms
    runningSince.value = null
    now.value = Date.now()
  }

  /** Pauses the clock (e.g. when the tab is hidden) and saves progress. */
  function pause(): void {
    stopTimer()
    save()
  }

  /** Resumes the clock if a started game is in progress. */
  function resume(): void {
    if (counted.value && isPlaying.value) startTimer()
  }

  // ── Persistence ────────────────────────────────────────────────────────
  function save(): void {
    if (!isPlaying.value) {
      persisted.clear()
      return
    }
    persisted.save({
      state: serializeGameState(state.value),
      initial: initialState.value ? serializeGameState(initialState.value) : null,
      elapsedMs: elapsedMs.value,
      counted: counted.value,
      hintsUsed: hintsUsed.value,
    })
  }

  function restore(): boolean {
    const saved = persisted.load()
    if (!saved) return false
    state.value = deserializeGameState(saved.state)!
    initialState.value = saved.initial ? deserializeGameState(saved.initial) : null
    counted.value = saved.counted
    hintsUsed.value = saved.hintsUsed
    generation.value++
    history.clear()
    historyVersion.value++
    resetTimer(saved.elapsedMs)
    events.emit('game:new', {
      message: 'Welcome back! Your game has been restored.',
      restored: true,
    })
    return true
  }

  // ── Game lifecycle ─────────────────────────────────────────────────────
  function abandonCurrentGame(): void {
    if (counted.value && isPlaying.value) {
      stopTimer()
      stats.recordLoss({ timeMs: elapsedMs.value })
    }
  }

  function startFrom(next: GameState, message: string): void {
    abandonCurrentGame()
    state.value = next
    history.clear()
    historyVersion.value++
    generation.value++
    counted.value = false
    hintsUsed.value = 0
    activeHint.value = null
    autoCompleting.value = false
    resetTimer()
    save()
    events.emit('game:new', { message, restored: false })
  }

  /** Deals a new game, recording the current one as a loss if it was started. */
  function newGame(options: NewGameOptions = {}): void {
    const deal = new GameBuilder()
      .withDrawCount(options.drawCount ?? settings.drawCount)
      .withSeed(options.seed ?? null)
      .build()
    initialState.value = deal
    const mode = deal.drawCount === 1 ? 'Draw one' : 'Draw three'
    startFrom(deal, `New game dealt. ${mode}.`)
  }

  /** Restarts the current deal from the beginning. */
  function restartGame(): void {
    if (!initialState.value) return newGame()
    startFrom(initialState.value, 'Game restarted.')
  }

  /** Restores a saved game, or deals a new one (always deals when a seed is given). */
  function init(options: NewGameOptions = {}): void {
    if (options.seed === undefined || options.seed === null) {
      if (restore()) return
    }
    newGame(options)
  }

  /** Replaces the table with an arbitrary state (test fixtures, debugging). */
  function loadState(next: GameState): void {
    initialState.value = next
    startFrom(next, 'Game loaded.')
  }

  // ── Commands ───────────────────────────────────────────────────────────
  function handleWin(): void {
    stopTimer()
    const timeMs = elapsedMs.value
    const moves = state.value.moveCount
    stats.recordWin({ timeMs, moves })
    persisted.clear()
    events.emit('game:won', { moves, timeMs, message: 'You won! Congratulations!' })
  }

  function apply(result: EngineResult, cardId?: string): MoveResult {
    if (!result.ok) {
      events.emit('move:invalid', { reason: result.reason, cardId })
      return { success: false, reason: result.reason }
    }
    const message = describeResult(result)
    state.value = history.execute(new MoveCommand(result.state, message), state.value)
    historyVersion.value++
    activeHint.value = null
    if (!counted.value) {
      counted.value = true
      stats.recordGameStarted()
    }
    if (result.kind === 'move') {
      events.emit('cards:moved', {
        cards: result.cards,
        move: result.move!,
        revealed: result.revealed,
        toFoundation: result.move!.to.type === 'foundation',
        message,
      })
    } else {
      events.emit('cards:drawn', {
        cards: result.cards,
        recycled: result.kind === 'recycle',
        message,
      })
    }
    if (result.state.status === 'won') {
      handleWin()
    } else {
      startTimer()
      save()
    }
    return { success: true, message }
  }

  /** Draws from the stock (or recycles the waste). */
  function drawFromStock(): MoveResult {
    return apply(engineDraw(state.value))
  }

  /** Moves the card at `move.cardIndex` of `move.from` (and those above it) to `move.to`. */
  function move(candidate: Move): MoveResult {
    const cardId = pileAt(state.value, candidate.from)?.[candidate.cardIndex]?.card.id
    return apply(engineMoveCards(state.value, candidate), cardId)
  }

  /** Moves `card` (and any cards on top of it) to `to`. */
  function moveCard(card: Card, to: PileLocation): MoveResult {
    const position = locateCard(state.value, card.id)
    if (!position) {
      const reason = `${card.name} is not on the table.`
      events.emit('move:invalid', { reason, cardId: card.id })
      return { success: false, reason }
    }
    return move({ from: position.location, cardIndex: position.index, to })
  }

  /** Sends the top card of `from` to a foundation, if possible (double-click). */
  function autoMove(from: PileLocation): MoveResult {
    const cardId = pileAt(state.value, from)?.at(-1)?.card.id
    return apply(engineAutoMove(state.value, from), cardId)
  }

  /** Whether the card at `index` of `location` can be picked up. */
  function canPickUp(location: PileLocation, index: number): boolean {
    return engineCanPickUp(state.value, location, index)
  }

  /** Validates a prospective move without applying it. */
  function validate(candidate: Move) {
    return new MoveValidator(state.value).validate(candidate)
  }

  function undo(): boolean {
    if (!canUndo.value) return false
    const result = history.undo()!
    state.value = result.state
    historyVersion.value++
    activeHint.value = null
    save()
    events.emit('history:changed', {
      direction: 'undo',
      message: `Undone. ${result.command.label}`,
    })
    return true
  }

  function redo(): boolean {
    if (!canRedo.value) return false
    const result = history.redo(state.value)!
    state.value = result.state
    historyVersion.value++
    activeHint.value = null
    save()
    events.emit('history:changed', {
      direction: 'redo',
      message: `Redone. ${result.command.label}`,
    })
    return true
  }

  /** Finds (and highlights) the best available move, respecting the hint limit. */
  function hint(): Hint | null {
    if (!isPlaying.value) return null
    if (hintsRemaining.value === 0) {
      activeHint.value = null
      events.emit('hint', { hint: null, message: 'No hints left for this game.' })
      return null
    }
    const best = getBestHint(state.value)
    activeHint.value = best
    if (best) hintsUsed.value++
    events.emit('hint', {
      hint: best,
      message: best ? `Hint: ${best.description}` : 'No moves available. Try starting a new game.',
    })
    save()
    return best
  }

  function clearHint(): void {
    activeHint.value = null
  }

  /** Plays out a solved game one foundation move at a time. */
  async function autoComplete(stepDelayMs = 120): Promise<void> {
    if (!canAutoComplete.value) return
    autoCompleting.value = true
    try {
      for (
        let next = nextAutoCompleteMove(state.value);
        next;
        next = nextAutoCompleteMove(state.value)
      ) {
        if (!autoCompleting.value) break
        apply(engineMoveCards(state.value, next))
        if (stepDelayMs > 0) await new Promise((resolve) => setTimeout(resolve, stepDelayMs))
      }
    } finally {
      autoCompleting.value = false
    }
  }

  return {
    // State (read-only)
    state: computed(() => state.value),
    elapsedMs,
    moveCount: computed(() => state.value.moveCount),
    activeHint: computed(() => activeHint.value),
    hintsUsed: computed(() => hintsUsed.value),
    autoCompleting: computed(() => autoCompleting.value),
    generation: computed(() => generation.value),
    // Getters
    isPlaying,
    hasWon,
    canUndo,
    canRedo,
    canDraw,
    canAutoComplete,
    hintsRemaining,
    isTimerRunning,
    // Actions
    init,
    newGame,
    restartGame,
    loadState,
    drawFromStock,
    move,
    moveCard,
    autoMove,
    canPickUp,
    validate,
    undo,
    redo,
    hint,
    clearHint,
    autoComplete,
    tick,
    pause,
    resume,
    events,
  }
})
