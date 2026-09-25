/** The four kinds of pile on a Klondike table. */
export type PileType = 'stock' | 'waste' | 'foundation' | 'tableau'

/** Identifies a concrete pile on the table. `index` is 0 for stock and waste. */
export interface PileLocation {
  readonly type: PileType
  readonly index: number
}

/** Number of tableau piles in Klondike. */
export const TABLEAU_COUNT = 7
/** Number of foundation piles in Klondike. */
export const FOUNDATION_COUNT = 4

/** Convenience constructors for pile locations. */
export const Locations = Object.freeze({
  stock: (): PileLocation => ({ type: 'stock', index: 0 }),
  waste: (): PileLocation => ({ type: 'waste', index: 0 }),
  foundation: (index: number): PileLocation => ({ type: 'foundation', index }),
  tableau: (index: number): PileLocation => ({ type: 'tableau', index }),
})

/** Structural equality for pile locations. */
export function sameLocation(a: PileLocation, b: PileLocation): boolean {
  return a.type === b.type && a.index === b.index
}

/** Stable string key for a location, e.g. `tableau-3`. */
export function locationKey(location: PileLocation): string {
  return `${location.type}-${location.index}`
}
