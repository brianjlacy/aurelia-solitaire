import type { PileLocation } from './PileType'

/** Moving the card at `cardIndex` of `from` (and every card above it) onto `to`. */
export interface Move {
  readonly from: PileLocation
  readonly cardIndex: number
  readonly to: PileLocation
}
