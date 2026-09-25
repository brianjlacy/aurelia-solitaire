import type { Rank } from '../types/Rank'
import { ALL_RANKS, isRank, rankLongName, rankShortName } from '../types/Rank'
import type { Suit } from '../types/Suit'
import { ALL_SUITS, isRedSuit, isSuit, SUIT_NAMES, SUIT_SYMBOLS } from '../types/Suit'

/**
 * An immutable playing card.
 *
 * Instances are frozen, which also tells Vue's reactivity system to leave
 * them alone (non-extensible objects are never proxied) — cards can be shared
 * freely between game-state snapshots.
 */
export class Card {
  /** Stable identifier, e.g. `hearts-1` for the Ace of Hearts. */
  public readonly id: string

  constructor(
    public readonly suit: Suit,
    public readonly rank: Rank,
  ) {
    this.id = `${suit}-${rank}`
    Object.freeze(this)
  }

  /** Whether the card is a heart or diamond. */
  get isRed(): boolean {
    return isRedSuit(this.suit)
  }

  /** Whether the card is a club or spade. */
  get isBlack(): boolean {
    return !this.isRed
  }

  /** Short rank label for the face: A, 2–10, J, Q, K. */
  get displayRank(): string {
    return rankShortName(this.rank)
  }

  /** Suit glyph (♥ ♦ ♣ ♠). */
  get suitSymbol(): string {
    return SUIT_SYMBOLS[this.suit]
  }

  /** Accessible name, e.g. "Ace of Hearts" or "10 of Spades". */
  get name(): string {
    return `${rankLongName(this.rank)} of ${SUIT_NAMES[this.suit]}`
  }

  /** Compact label, e.g. "A♥". */
  get shortName(): string {
    return `${this.displayRank}${this.suitSymbol}`
  }

  /** Identity comparison by id. */
  equals(other: Card): boolean {
    return this.id === other.id
  }

  /**
   * Whether this card may be placed on `other`.
   *
   * @param other - The card currently on top of the target pile
   * @param isFoundation - Foundation rules (same suit, ascending) when true;
   *   tableau rules (alternating colour, descending) otherwise
   */
  canStackOn(other: Card, isFoundation: boolean): boolean {
    if (isFoundation) {
      return this.suit === other.suit && this.rank === other.rank + 1
    }
    return this.rank === other.rank - 1 && this.isRed !== other.isRed
  }

  /** Returns the shared instance for a suit/rank pair. */
  static of(suit: Suit, rank: Rank): Card {
    return REGISTRY.get(`${suit}-${rank}`) as Card
  }

  /** Parses an id produced by {@link Card.id}; returns `undefined` for invalid ids. */
  static fromId(id: unknown): Card | undefined {
    return typeof id === 'string' ? REGISTRY.get(id) : undefined
  }

  /** Validates a suit/rank pair from untrusted input. */
  static isValid(suit: unknown, rank: unknown): boolean {
    return isSuit(suit) && isRank(rank)
  }
}

const REGISTRY: ReadonlyMap<string, Card> = new Map(
  ALL_SUITS.flatMap((suit) =>
    ALL_RANKS.map((rank) => {
      const card = new Card(suit, rank)
      return [card.id, card] as const
    }),
  ),
)

/** A fresh, ordered 52-card deck (shared card instances). */
export function createDeck(): Card[] {
  return [...REGISTRY.values()]
}
