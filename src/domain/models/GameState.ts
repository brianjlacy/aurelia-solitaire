import type { PileCards } from './Pile'
import { Suit } from '../types/Suit'

/** Lifecycle of a single deal. */
export type GameStatus = 'idle' | 'playing' | 'won'

/** Cards drawn from the stock per click. */
export type DrawCount = 1 | 3

/** Suit assigned to each foundation pile, left to right. */
export const FOUNDATION_SUITS: readonly Suit[] = Object.freeze([
  Suit.Hearts,
  Suit.Diamonds,
  Suit.Spades,
  Suit.Clubs,
])

/**
 * Complete, immutable snapshot of a Klondike table.
 *
 * Every engine operation returns a new object, so snapshots can be kept for
 * undo/redo without copying and are safe to serialise.
 */
export interface GameState {
  readonly stock: PileCards
  readonly waste: PileCards
  readonly foundations: readonly PileCards[]
  readonly tableau: readonly PileCards[]
  readonly drawCount: DrawCount
  readonly moveCount: number
  readonly status: GameStatus
  /** Seed used to deal, or `null` for a cryptographically random deal. */
  readonly seed: number | null
  /** Number of times the waste has been recycled into the stock. */
  readonly recycleCount: number
}

/** An empty table (used before the first deal). */
export function emptyGameState(drawCount: DrawCount = 3): GameState {
  return {
    stock: [],
    waste: [],
    foundations: [[], [], [], []],
    tableau: [[], [], [], [], [], [], []],
    drawCount,
    moveCount: 0,
    status: 'idle',
    seed: null,
    recycleCount: 0,
  }
}

/** All cards currently on the table, in pile order. */
export function allPlacedCards(state: GameState): PileCards {
  return [...state.stock, ...state.waste, ...state.foundations.flat(), ...state.tableau.flat()]
}
