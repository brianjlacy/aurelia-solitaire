/** The four French suits. String values double as stable identifiers. */
export enum Suit {
  Hearts = 'hearts',
  Diamonds = 'diamonds',
  Clubs = 'clubs',
  Spades = 'spades',
}

/** All suits in canonical order (used when building a deck). */
export const ALL_SUITS: readonly Suit[] = Object.freeze([
  Suit.Hearts,
  Suit.Diamonds,
  Suit.Clubs,
  Suit.Spades,
])

/** Unicode glyph for each suit. */
export const SUIT_SYMBOLS: Readonly<Record<Suit, string>> = Object.freeze({
  [Suit.Hearts]: '♥',
  [Suit.Diamonds]: '♦',
  [Suit.Clubs]: '♣',
  [Suit.Spades]: '♠',
})

/** Human readable, capitalised suit names. */
export const SUIT_NAMES: Readonly<Record<Suit, string>> = Object.freeze({
  [Suit.Hearts]: 'Hearts',
  [Suit.Diamonds]: 'Diamonds',
  [Suit.Clubs]: 'Clubs',
  [Suit.Spades]: 'Spades',
})

/** Whether the suit is red (hearts, diamonds). */
export function isRedSuit(suit: Suit): boolean {
  return suit === Suit.Hearts || suit === Suit.Diamonds
}

/** Type guard for suit identifiers coming from untrusted input. */
export function isSuit(value: unknown): value is Suit {
  return typeof value === 'string' && (ALL_SUITS as readonly string[]).includes(value)
}
