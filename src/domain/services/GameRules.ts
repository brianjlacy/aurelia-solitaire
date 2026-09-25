import type { Card } from '../models/Card'
import { topOf, type PileCards } from '../models/Pile'
import { Rank } from '../types/Rank'
import type { Suit } from '../types/Suit'

/**
 * Strategy interface for a solitaire variant's placement rules.
 * Klondike is the only implementation today; Spider, FreeCell etc. could
 * implement the same contract.
 */
export interface SolitaireRules {
  readonly name: string
  /** Whether `card` (the base of the moving run) may be placed on a tableau pile. */
  canMoveToTableau(card: Card, pile: PileCards): boolean
  /** Whether `card` may be placed on a foundation pile reserved for `suit`. */
  canMoveToFoundation(card: Card, pile: PileCards, suit: Suit): boolean
  /** Whether a run of cards may be picked up together. */
  isMovableSequence(cards: PileCards): boolean
  /** Whether the foundations represent a finished game. */
  hasWon(foundations: readonly PileCards[]): boolean
}

/** Klondike placement rules. */
export class KlondikeRules implements SolitaireRules {
  readonly name = 'Klondike'

  canMoveToTableau(card: Card, pile: PileCards): boolean {
    const top = topOf(pile)
    if (!top) return card.rank === Rank.King
    return top.faceUp && card.canStackOn(top.card, false)
  }

  canMoveToFoundation(card: Card, pile: PileCards, suit: Suit): boolean {
    if (card.suit !== suit) return false
    const top = topOf(pile)
    if (!top) return card.rank === Rank.Ace
    return card.canStackOn(top.card, true)
  }

  isMovableSequence(cards: PileCards): boolean {
    if (cards.length === 0) return false
    return cards.every((placed, i) => {
      if (!placed.faceUp) return false
      const below = cards[i - 1]
      return below === undefined || placed.card.canStackOn(below.card, false)
    })
  }

  hasWon(foundations: readonly PileCards[]): boolean {
    return foundations.every((pile) => topOf(pile)?.card.rank === Rank.King)
  }

  /**
   * Index of the foundation that accepts `card`, or `-1`.
   *
   * @param suits - Suit reserved for each foundation, by index
   */
  findAutoMoveTarget(
    card: Card,
    foundations: readonly PileCards[],
    suits: readonly Suit[],
  ): number {
    return foundations.findIndex((pile, i) =>
      this.canMoveToFoundation(card, pile, suits[i] as Suit),
    )
  }
}

/** Shared Klondike rules instance. */
export const klondikeRules = new KlondikeRules()
