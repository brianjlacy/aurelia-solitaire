/**
 * Helpers for building game states from compact card notation.
 * Used by unit tests and by E2E builds (via `window.__solitaire`).
 *
 * Notation: rank (`A`, `2`–`10`, `J`, `Q`, `K`) followed by suit
 * (`H`, `D`, `C`, `S`). Prefix with `#` for face-down, `^` for face-up;
 * otherwise the pile's default orientation is used.
 */
import { Card, createDeck } from '@/domain/models/Card'
import {
  emptyGameState,
  FOUNDATION_SUITS,
  type DrawCount,
  type GameState,
} from '@/domain/models/GameState'
import { place, type PileCards, type PlacedCard } from '@/domain/models/Pile'
import type { Rank } from '@/domain/types/Rank'
import { Suit } from '@/domain/types/Suit'

const SUIT_CODES: Record<string, Suit> = {
  H: Suit.Hearts,
  D: Suit.Diamonds,
  C: Suit.Clubs,
  S: Suit.Spades,
}
const RANK_CODES: Record<string, Rank> = { A: 1, J: 11, Q: 12, K: 13, T: 10 }

/** Parses `"AH"`, `"10S"`, `"QD"` into a card. */
export function card(code: string): Card {
  const match = /^(A|[2-9]|10|T|J|Q|K)([HDCS])$/i.exec(code.trim())
  if (!match) throw new Error(`Invalid card code: ${code}`)
  const rankCode = match[1]!.toUpperCase()
  const rank = (RANK_CODES[rankCode] ?? Number(rankCode)) as Rank
  return Card.of(SUIT_CODES[match[2]!.toUpperCase()]!, rank)
}

function placed(code: string, defaultFaceUp: boolean): PlacedCard {
  if (code.startsWith('#')) return place(card(code.slice(1)), false)
  if (code.startsWith('^')) return place(card(code.slice(1)), true)
  return place(card(code), defaultFaceUp)
}

/** Parses a space-separated pile, bottom card first. */
export function pile(codes: string, defaultFaceUp = true): PileCards {
  return codes.trim() === ''
    ? []
    : codes
        .trim()
        .split(/\s+/)
        .map((c) => placed(c, defaultFaceUp))
}

export interface LayoutSpec {
  stock?: string
  waste?: string
  /** Foundations as the highest rank reached per foundation (0 = empty), in FOUNDATION_SUITS order. */
  foundationRanks?: readonly number[]
  tableau?: readonly string[]
  drawCount?: DrawCount
  moveCount?: number
  /** Distribute any cards not mentioned into the stock so the deck is complete. */
  fillStock?: boolean
}

/** Builds a state from notation. Tableau cards default to face-up; stock to face-down. */
export function layout(spec: LayoutSpec): GameState {
  const foundations = FOUNDATION_SUITS.map((suit, i) =>
    Array.from({ length: spec.foundationRanks?.[i] ?? 0 }, (_, r) =>
      place(Card.of(suit, (r + 1) as Rank), true),
    ),
  )
  const tableau = Array.from({ length: 7 }, (_, i) => pile(spec.tableau?.[i] ?? ''))
  const waste = pile(spec.waste ?? '')
  let stock = pile(spec.stock ?? '', false)
  if (spec.fillStock) {
    const used = new Set(
      [...foundations.flat(), ...tableau.flat(), ...waste, ...stock].map((p) => p.card.id),
    )
    stock = [
      ...stock,
      ...createDeck()
        .filter((c) => !used.has(c.id))
        .map((c) => place(c, false)),
    ]
  }
  return {
    ...emptyGameState(spec.drawCount ?? 3),
    stock,
    waste,
    foundations,
    tableau,
    status: 'playing',
    moveCount: spec.moveCount ?? 0,
  }
}

/** A game one move from victory: the King of Clubs waits on the first tableau pile. */
export function nearWinState(): GameState {
  return layout({ foundationRanks: [13, 13, 13, 12], tableau: ['KC'], moveCount: 99 })
}

/**
 * All cards face-up in the tableau, stock empty — ready for auto-complete.
 * Each column holds a descending, alternating run.
 */
export function autoCompleteState(): GameState {
  return layout({
    foundationRanks: [10, 10, 10, 10],
    tableau: ['KH QS JD', 'KS QD JC', 'KD QC JH', 'KC QH JS'],
    moveCount: 150,
  })
}

/** A fresh-looking deal with an Ace of Spades available on the first tableau pile. */
export function aceReadyState(): GameState {
  return layout({
    tableau: ['AS', '#3D 5C', '#4H #6D 8S', '#7C #9H #JD KS', '', '', ''],
    fillStock: true,
  })
}
