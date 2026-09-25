/** Card ranks; the numeric value is the card's pip value (Ace low). */
export enum Rank {
  Ace = 1,
  Two = 2,
  Three = 3,
  Four = 4,
  Five = 5,
  Six = 6,
  Seven = 7,
  Eight = 8,
  Nine = 9,
  Ten = 10,
  Jack = 11,
  Queen = 12,
  King = 13,
}

/** All ranks from Ace to King. */
export const ALL_RANKS: readonly Rank[] = Object.freeze(
  Array.from({ length: 13 }, (_, i) => (i + 1) as Rank),
)

const SHORT_NAMES: Readonly<Partial<Record<Rank, string>>> = {
  [Rank.Ace]: 'A',
  [Rank.Jack]: 'J',
  [Rank.Queen]: 'Q',
  [Rank.King]: 'K',
}

const LONG_NAMES: Readonly<Partial<Record<Rank, string>>> = {
  [Rank.Ace]: 'Ace',
  [Rank.Jack]: 'Jack',
  [Rank.Queen]: 'Queen',
  [Rank.King]: 'King',
}

/** Short label used on the card face: A, 2–10, J, Q, K. */
export function rankShortName(rank: Rank): string {
  return SHORT_NAMES[rank] ?? String(rank)
}

/** Label used in accessible names: Ace, 2–10, Jack, Queen, King. */
export function rankLongName(rank: Rank): string {
  return LONG_NAMES[rank] ?? String(rank)
}

/** Type guard for rank values coming from untrusted input. */
export function isRank(value: unknown): value is Rank {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 13
}
