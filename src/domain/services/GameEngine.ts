import type { Card } from '../models/Card'
import { FOUNDATION_SUITS, type GameState } from '../models/GameState'
import { place, revealTop, splitAt, topOf, type PileCards } from '../models/Pile'
import type { Move } from '../types/Move'
import { Locations, type PileLocation } from '../types/PileType'
import { klondikeRules, type SolitaireRules } from './GameRules'
import { MoveValidator, pileAt } from './MoveValidator'

/** What kind of change an engine action made. */
export type ActionKind = 'draw' | 'recycle' | 'move'

/** Result of an engine action. */
export type EngineResult =
  | {
      readonly ok: true
      readonly state: GameState
      readonly kind: ActionKind
      /** Cards that changed pile (drawn or moved). */
      readonly cards: readonly Card[]
      /** A tableau card turned face-up as a consequence of the move. */
      readonly revealed?: Card
      readonly move?: Move
    }
  | { readonly ok: false; readonly reason: string }

function fail(reason: string): EngineResult {
  return { ok: false, reason }
}

const PILE_KEYS = {
  stock: 'stock',
  waste: 'waste',
  foundation: 'foundations',
  tableau: 'tableau',
} as const

function replacePile(state: GameState, location: PileLocation, pile: PileCards): GameState {
  const key = PILE_KEYS[location.type]
  if (key === 'foundations' || key === 'tableau') {
    return { ...state, [key]: state[key].map((p, i) => (i === location.index ? pile : p)) }
  }
  return { ...state, [key]: pile }
}

function finish(state: GameState, rules: SolitaireRules): GameState {
  const status = rules.hasWon(state.foundations) ? 'won' : 'playing'
  return { ...state, moveCount: state.moveCount + 1, status }
}

/** Whether clicking the stock would do anything. */
export function canDraw(state: GameState): boolean {
  return state.status !== 'won' && (state.stock.length > 0 || state.waste.length > 0)
}

/**
 * Draws `drawCount` cards from the stock onto the waste, or recycles the
 * waste back into the stock when the stock is empty.
 */
export function draw(state: GameState): EngineResult {
  if (state.status === 'won') return fail('The game is already won.')
  if (state.stock.length === 0) {
    if (state.waste.length === 0) return fail('There are no cards left to draw.')
    const stock = [...state.waste].reverse().map((p) => place(p.card, false))
    const next = { ...state, stock, waste: [], recycleCount: state.recycleCount + 1 }
    return {
      ok: true,
      kind: 'recycle',
      state: finish(next, klondikeRules),
      cards: stock.map((p) => p.card),
    }
  }
  const count = Math.min(state.drawCount, state.stock.length)
  const drawn = state.stock
    .slice(-count)
    .reverse()
    .map((p) => place(p.card, true))
  const next = { ...state, stock: state.stock.slice(0, -count), waste: [...state.waste, ...drawn] }
  return {
    ok: true,
    kind: 'draw',
    state: finish(next, klondikeRules),
    cards: drawn.map((p) => p.card),
  }
}

/** Validates and applies a move, revealing any newly exposed tableau card. */
export function moveCards(
  state: GameState,
  move: Move,
  rules: SolitaireRules = klondikeRules,
): EngineResult {
  const validation = new MoveValidator(state, rules).validate(move)
  if (!validation.valid) return fail(validation.reason)

  const source = pileAt(state, move.from) as PileCards
  const target = pileAt(state, move.to) as PileCards
  const [remaining, moving] = splitAt(source, move.cardIndex)
  const exposed = topOf(remaining)
  const revealed =
    move.from.type === 'tableau' && exposed && !exposed.faceUp ? exposed.card : undefined

  let next = replacePile(
    state,
    move.from,
    move.from.type === 'tableau' ? revealTop(remaining) : remaining,
  )
  next = replacePile(next, move.to, [...target, ...moving])
  return {
    ok: true,
    kind: 'move',
    state: finish(next, rules),
    cards: moving.map((p) => p.card),
    revealed,
    move,
  }
}

/** The move that sends the top card of `from` to its foundation, if legal. */
export function findFoundationMove(
  state: GameState,
  from: PileLocation,
  rules: SolitaireRules = klondikeRules,
): Move | null {
  if (from.type !== 'tableau' && from.type !== 'waste') return null
  const pile = pileAt(state, from)
  const top = pile && topOf(pile)
  if (!pile || !top || !top.faceUp) return null
  const index = state.foundations.findIndex((f, i) =>
    rules.canMoveToFoundation(top.card, f, FOUNDATION_SUITS[i]!),
  )
  return index === -1 ? null : { from, cardIndex: pile.length - 1, to: Locations.foundation(index) }
}

/** Moves the top card of `from` to a foundation (double-click behaviour). */
export function autoMoveToFoundation(
  state: GameState,
  from: PileLocation,
  rules: SolitaireRules = klondikeRules,
): EngineResult {
  const move = findFoundationMove(state, from, rules)
  if (!move) {
    const top = (() => {
      const pile = pileAt(state, from)
      return pile ? topOf(pile) : undefined
    })()
    return fail(
      top?.faceUp ? `${top.card.name} cannot go to a foundation yet.` : 'There is no card to move.',
    )
  }
  return moveCards(state, move, rules)
}

/**
 * Whether the rest of the game can be played automatically: the stock and
 * waste are empty and every tableau card is face-up.
 */
export function canAutoComplete(state: GameState): boolean {
  return (
    state.status === 'playing' &&
    state.stock.length === 0 &&
    state.waste.length === 0 &&
    state.tableau.every((pile) => pile.every((p) => p.faceUp))
  )
}

/** Next move of an auto-complete: the lowest-ranked tableau top card that fits a foundation. */
export function nextAutoCompleteMove(state: GameState): Move | null {
  let best: Move | null = null
  let bestRank = Infinity
  for (let index = 0; index < state.tableau.length; index++) {
    const move = findFoundationMove(state, Locations.tableau(index))
    const rank = move ? state.tableau[index]![move.cardIndex]!.card.rank : Infinity
    if (move && rank < bestRank) {
      best = move
      bestRank = rank
    }
  }
  return best
}

/** Every legal move on the board, excluding stock draws. */
export function listLegalMoves(state: GameState, rules: SolitaireRules = klondikeRules): Move[] {
  if (state.status === 'won') return []
  const validator = new MoveValidator(state, rules)
  const sources: { location: PileLocation; pile: PileCards }[] = [
    { location: Locations.waste(), pile: state.waste },
    ...state.foundations.map((pile, i) => ({ location: Locations.foundation(i), pile })),
    ...state.tableau.map((pile, i) => ({ location: Locations.tableau(i), pile })),
  ]
  const targets: PileLocation[] = [
    ...state.foundations.map((_, i) => Locations.foundation(i)),
    ...state.tableau.map((_, i) => Locations.tableau(i)),
  ]
  const moves: Move[] = []
  for (const { location, pile } of sources) {
    const firstIndex = location.type === 'tableau' ? 0 : pile.length - 1
    for (let cardIndex = Math.max(firstIndex, 0); cardIndex < pile.length; cardIndex++) {
      if (!pile[cardIndex]!.faceUp) continue
      for (const to of targets) {
        const move = { from: location, cardIndex, to }
        if (validator.isValid(move)) moves.push(move)
      }
    }
  }
  return moves
}

/** Where a card currently sits on the table. */
export interface CardPosition {
  readonly location: PileLocation
  readonly index: number
}

/** Finds a card by id, or returns `null` if it is not on the table. */
export function locateCard(state: GameState, cardId: string): CardPosition | null {
  const piles: [PileLocation, PileCards][] = [
    [Locations.stock(), state.stock],
    [Locations.waste(), state.waste],
    ...state.foundations.map((p, i): [PileLocation, PileCards] => [Locations.foundation(i), p]),
    ...state.tableau.map((p, i): [PileLocation, PileCards] => [Locations.tableau(i), p]),
  ]
  for (const [location, pile] of piles) {
    const index = pile.findIndex((p) => p.card.id === cardId)
    if (index !== -1) return { location, index }
  }
  return null
}

/**
 * Whether the card at `index` of `location` may be picked up: a face-up
 * tableau card heading a valid run, or the top card of the waste or a foundation.
 */
export function canPickUp(
  state: GameState,
  location: PileLocation,
  index: number,
  rules: SolitaireRules = klondikeRules,
): boolean {
  if (state.status === 'won' || location.type === 'stock') return false
  const pile = pileAt(state, location)
  if (!pile || !pile[index]) return false
  if (location.type !== 'tableau') return index === pile.length - 1
  return rules.isMovableSequence(pile.slice(index))
}
