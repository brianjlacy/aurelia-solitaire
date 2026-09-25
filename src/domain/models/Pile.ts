import type { Card } from './Card'

/** A card as it sits on the table. */
export interface PlacedCard {
  readonly card: Card
  readonly faceUp: boolean
}

/** An ordered pile; the last element is the top card. */
export type PileCards = readonly PlacedCard[]

/** Wraps a card with an orientation. */
export function place(card: Card, faceUp: boolean): PlacedCard {
  return { card, faceUp }
}

/** Top card of a pile, if any. */
export function topOf(pile: PileCards): PlacedCard | undefined {
  return pile[pile.length - 1]
}

/** Whether a pile has no cards. */
export function isEmpty(pile: PileCards): boolean {
  return pile.length === 0
}

/** Index of the first face-up card, or `pile.length` when none are face-up. */
export function firstFaceUpIndex(pile: PileCards): number {
  const index = pile.findIndex((p) => p.faceUp)
  return index === -1 ? pile.length : index
}

/** Number of face-down cards in a pile. */
export function faceDownCount(pile: PileCards): number {
  return pile.filter((p) => !p.faceUp).length
}

/** Returns a copy of the pile with its top card turned face-up. */
export function revealTop(pile: PileCards): PileCards {
  const top = topOf(pile)
  if (!top || top.faceUp) return pile
  return [...pile.slice(0, -1), place(top.card, true)]
}

/**
 * Splits a pile at `index`.
 *
 * @returns `[remaining, taken]` where `taken` starts at `index`
 */
export function splitAt(pile: PileCards, index: number): [PileCards, PileCards] {
  if (index < 0 || index >= pile.length) {
    throw new RangeError(`Cannot take from index ${index} of a pile with ${pile.length} cards`)
  }
  return [pile.slice(0, index), pile.slice(index)]
}
