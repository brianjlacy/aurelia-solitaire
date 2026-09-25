import { FOUNDATION_SUITS, type GameState } from '../models/GameState'
import { topOf, type PileCards } from '../models/Pile'
import type { Move } from '../types/Move'
import { FOUNDATION_COUNT, sameLocation, TABLEAU_COUNT, type PileLocation } from '../types/PileType'
import { SUIT_NAMES, type Suit } from '../types/Suit'
import { klondikeRules, type SolitaireRules } from './GameRules'

/** Outcome of validating a move. */
export type ValidationResult =
  { readonly valid: true } | { readonly valid: false; readonly reason: string }

const VALID: ValidationResult = Object.freeze({ valid: true })

function invalid(reason: string): ValidationResult {
  return { valid: false, reason }
}

/** Returns the pile at `location`, or `undefined` when the location does not exist. */
export function pileAt(state: GameState, location: PileLocation): PileCards | undefined {
  switch (location.type) {
    case 'stock':
      return location.index === 0 ? state.stock : undefined
    case 'waste':
      return location.index === 0 ? state.waste : undefined
    case 'foundation':
      return location.index >= 0 && location.index < FOUNDATION_COUNT
        ? state.foundations[location.index]
        : undefined
    case 'tableau':
      return location.index >= 0 && location.index < TABLEAU_COUNT
        ? state.tableau[location.index]
        : undefined
  }
}

/**
 * Validates moves against a game state, explaining why a move is illegal.
 *
 * @example
 * ```ts
 * const result = new MoveValidator(state).validate(move)
 * if (!result.valid) announce(result.reason)
 * ```
 */
export class MoveValidator {
  constructor(
    private readonly state: GameState,
    private readonly rules: SolitaireRules = klondikeRules,
  ) {}

  validate(move: Move): ValidationResult {
    const { state, rules } = this
    if (state.status === 'won') return invalid('The game is already won.')

    const source = pileAt(state, move.from)
    const target = pileAt(state, move.to)
    if (!source || !target) return invalid('That pile does not exist.')
    if (move.from.type === 'stock') return invalid('Click the stock to draw cards.')
    if (move.to.type === 'stock' || move.to.type === 'waste') {
      return invalid(`Cards cannot be placed on the ${move.to.type}.`)
    }
    if (sameLocation(move.from, move.to)) return invalid('The card is already in that pile.')

    const moving = source.slice(move.cardIndex)
    const base = moving[0]
    if (!Number.isInteger(move.cardIndex) || move.cardIndex < 0 || !base)
      return invalid('There is no card there.')
    if (!base.faceUp) return invalid('That card is face down.')
    if (move.from.type !== 'tableau' && moving.length > 1) {
      return invalid(`Only the top card can be moved from the ${move.from.type}.`)
    }
    if (!rules.isMovableSequence(moving)) {
      return invalid('Only a descending run of alternating colours can be moved together.')
    }

    if (move.to.type === 'foundation') {
      if (moving.length > 1) return invalid('Only one card at a time can go to a foundation.')
      const suit = FOUNDATION_SUITS[move.to.index] as Suit
      if (rules.canMoveToFoundation(base.card, target, suit)) return VALID
      if (base.card.suit !== suit) {
        return invalid(`${base.card.name} does not belong on the ${SUIT_NAMES[suit]} foundation.`)
      }
      const top = topOf(target)
      return invalid(
        top
          ? `${base.card.name} cannot go on ${top.card.name}.`
          : 'Only an Ace can start a foundation.',
      )
    }

    if (rules.canMoveToTableau(base.card, target)) return VALID
    const top = topOf(target)
    return invalid(
      top
        ? `${base.card.name} cannot be placed on ${top.faceUp ? top.card.name : 'a face-down card'}.`
        : 'Only a King can be placed on an empty tableau pile.',
    )
  }

  isValid(move: Move): boolean {
    return this.validate(move).valid
  }
}
