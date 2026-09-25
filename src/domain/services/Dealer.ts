import { createDeck } from '../models/Card'
import { emptyGameState, type DrawCount, type GameState } from '../models/GameState'
import { place, type PileCards, type PlacedCard } from '../models/Pile'
import { TABLEAU_COUNT } from '../types/PileType'
import { cryptoRandom, seededRandom, type RandomSource } from '../../utils/random'
import { shuffle } from '../../utils/shuffle'

/** Options for a deal. */
export interface DealOptions {
  drawCount?: DrawCount
  /** Deterministic seed; omit for a cryptographically random deal. */
  seed?: number | null
  /** Custom random source (overrides `seed`). */
  random?: RandomSource
}

/** Shuffles a deck and deals a Klondike layout. */
export class Dealer {
  /**
   * Deals a new game: tableau piles of 1–7 cards with only the top card
   * face-up, the remaining 24 cards face-down in the stock.
   */
  deal(options: DealOptions = {}): GameState {
    const seed = options.seed ?? null
    const random = options.random ?? (seed === null ? cryptoRandom() : seededRandom(seed))
    const deck = shuffle(createDeck(), random)

    const tableau: PlacedCard[][] = Array.from({ length: TABLEAU_COUNT }, () => [])
    for (let row = 0; row < TABLEAU_COUNT; row++) {
      for (let pile = row; pile < TABLEAU_COUNT; pile++) {
        const card = deck.pop()!
        ;(tableau[pile] as PlacedCard[]).push(place(card, row === pile))
      }
    }

    const stock: PileCards = deck.map((card) => place(card, false))
    return {
      ...emptyGameState(options.drawCount ?? 3),
      stock,
      tableau,
      status: 'playing',
      seed,
    }
  }
}
