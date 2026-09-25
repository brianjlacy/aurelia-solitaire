import { Card } from '../models/Card'
import {
  FOUNDATION_SUITS,
  type DrawCount,
  type GameState,
  type GameStatus,
} from '../models/GameState'
import { place, type PileCards } from '../models/Pile'
import { FOUNDATION_COUNT, TABLEAU_COUNT } from '../types/PileType'
import { isNonNegativeInteger, isRecord } from '../../utils/storage'

/** JSON-safe representation of a {@link GameState}. Cards are `"<id>:u"` or `"<id>:d"`. */
export interface SerializedGameState {
  stock: string[]
  waste: string[]
  foundations: string[][]
  tableau: string[][]
  drawCount: DrawCount
  moveCount: number
  status: GameStatus
  seed: number | null
  recycleCount: number
}

const STATUSES: readonly GameStatus[] = ['idle', 'playing', 'won']

function encodePile(pile: PileCards): string[] {
  return pile.map((p) => `${p.card.id}:${p.faceUp ? 'u' : 'd'}`)
}

/** Converts a game state into plain JSON data. */
export function serializeGameState(state: GameState): SerializedGameState {
  return {
    stock: encodePile(state.stock),
    waste: encodePile(state.waste),
    foundations: state.foundations.map(encodePile),
    tableau: state.tableau.map(encodePile),
    drawCount: state.drawCount,
    moveCount: state.moveCount,
    status: state.status,
    seed: state.seed,
    recycleCount: state.recycleCount,
  }
}

function decodePile(value: unknown, seen: Set<string>): PileCards | null {
  if (!Array.isArray(value)) return null
  const pile = []
  for (const entry of value) {
    if (typeof entry !== 'string') return null
    const match = /^([a-z]+-\d{1,2}):([ud])$/.exec(entry)
    const card = match ? Card.fromId(match[1]) : undefined
    if (!match || !card || seen.has(card.id)) return null
    seen.add(card.id)
    pile.push(place(card, match[2] === 'u'))
  }
  return pile
}

function decodePiles(value: unknown, count: number, seen: Set<string>): PileCards[] | null {
  if (!Array.isArray(value) || value.length !== count) return null
  const piles: PileCards[] = []
  for (const entry of value) {
    const pile = decodePile(entry, seen)
    if (!pile) return null
    piles.push(pile)
  }
  return piles
}

function foundationsAreConsistent(foundations: readonly PileCards[]): boolean {
  return foundations.every((pile, i) =>
    pile.every(
      (p, rank) => p.faceUp && p.card.suit === FOUNDATION_SUITS[i] && p.card.rank === rank + 1,
    ),
  )
}

function tableauIsConsistent(tableau: readonly PileCards[]): boolean {
  // Face-down cards may only sit beneath face-up ones, and the top card is always face-up.
  return tableau.every((pile) => {
    const firstUp = pile.findIndex((p) => p.faceUp)
    if (pile.length === 0) return true
    return firstUp !== -1 && pile.slice(firstUp).every((p) => p.faceUp)
  })
}

/**
 * Rebuilds a game state from untrusted data (e.g. localStorage), enforcing
 * every structural invariant: 52 unique cards, correct pile counts, card
 * orientation per pile, and ordered foundations. Returns `null` if invalid.
 */
export function deserializeGameState(data: unknown): GameState | null {
  if (!isRecord(data)) return null
  const seen = new Set<string>()
  const stock = decodePile(data.stock, seen)
  const waste = decodePile(data.waste, seen)
  const foundations = decodePiles(data.foundations, FOUNDATION_COUNT, seen)
  const tableau = decodePiles(data.tableau, TABLEAU_COUNT, seen)
  if (!stock || !waste || !foundations || !tableau || seen.size !== 52) return null

  const { drawCount, moveCount, status, seed, recycleCount } = data
  if (drawCount !== 1 && drawCount !== 3) return null
  if (!isNonNegativeInteger(moveCount) || !isNonNegativeInteger(recycleCount)) return null
  if (!STATUSES.includes(status as GameStatus)) return null
  if (seed !== null && !(isNonNegativeInteger(seed) && seed <= 0xffff_ffff)) return null
  if (stock.some((p) => p.faceUp) || waste.some((p) => !p.faceUp)) return null
  if (!foundationsAreConsistent(foundations) || !tableauIsConsistent(tableau)) return null

  return {
    stock,
    waste,
    foundations,
    tableau,
    drawCount,
    moveCount,
    status: status as GameStatus,
    seed,
    recycleCount,
  }
}
