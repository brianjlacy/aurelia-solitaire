import { describe, expect, it } from 'vitest'
import { MoveValidator, pileAt } from '@/domain/services/MoveValidator'
import { Locations, type Move, type PileLocation } from '@/domain/types'
import { layout, nearWinState } from '@/testing/fixtures'

const T = Locations.tableau
const F = Locations.foundation

function reason(state: ReturnType<typeof layout>, move: Move): string | undefined {
  const result = new MoveValidator(state).validate(move)
  return result.valid ? undefined : result.reason
}

describe('pileAt', () => {
  const state = layout({ stock: 'AH', waste: '2H', tableau: ['3H'] })
  it('resolves every pile type', () => {
    expect(pileAt(state, Locations.stock())).toBe(state.stock)
    expect(pileAt(state, Locations.waste())).toBe(state.waste)
    expect(pileAt(state, F(0))).toBe(state.foundations[0])
    expect(pileAt(state, T(0))).toBe(state.tableau[0])
  })

  it('returns undefined for unknown piles', () => {
    expect(pileAt(state, { type: 'stock', index: 1 })).toBeUndefined()
    expect(pileAt(state, { type: 'waste', index: 1 })).toBeUndefined()
    expect(pileAt(state, F(4))).toBeUndefined()
    expect(pileAt(state, F(-1))).toBeUndefined()
    expect(pileAt(state, T(7))).toBeUndefined()
    expect(pileAt(state, T(-1))).toBeUndefined()
  })
})

describe('MoveValidator', () => {
  const state = layout({
    stock: 'QC',
    waste: '9D 5H',
    foundationRanks: [2, 0, 0, 0],
    tableau: ['#8C 6S', 'KH QS JD', '', '7D', '3H', '#2D', 'AS'],
  })

  it('accepts legal moves', () => {
    const validator = new MoveValidator(state)
    expect(validator.isValid({ from: T(4), cardIndex: 0, to: F(0) })).toBe(true)
    expect(validator.isValid({ from: T(0), cardIndex: 1, to: T(3) })).toBe(true)
    expect(validator.isValid({ from: T(1), cardIndex: 0, to: T(2) })).toBe(true)
    expect(validator.isValid({ from: Locations.waste(), cardIndex: 1, to: T(0) })).toBe(true)
    expect(validator.isValid({ from: T(6), cardIndex: 0, to: F(2) })).toBe(true)
    expect(validator.validate({ from: T(6), cardIndex: 0, to: F(2) })).toEqual({ valid: true })
  })

  it('explains illegal moves', () => {
    expect(reason(nearWinState(), { from: T(0), cardIndex: 0, to: F(3) })).toBeUndefined()
    expect(reason({ ...state, status: 'won' }, { from: T(4), cardIndex: 0, to: F(0) })).toMatch(
      /already won/,
    )
    expect(reason(state, { from: T(9), cardIndex: 0, to: F(0) })).toMatch(/does not exist/)
    expect(reason(state, { from: Locations.stock(), cardIndex: 0, to: T(2) })).toMatch(/draw/)
    expect(reason(state, { from: T(4), cardIndex: 0, to: Locations.waste() })).toMatch(
      /placed on the waste/,
    )
    expect(reason(state, { from: T(4), cardIndex: 0, to: Locations.stock() })).toMatch(
      /placed on the stock/,
    )
    expect(reason(state, { from: T(4), cardIndex: 0, to: T(4) })).toMatch(/already in that pile/)
    expect(reason(state, { from: T(4), cardIndex: 3, to: F(0) })).toMatch(/no card/)
    expect(reason(state, { from: T(4), cardIndex: -1, to: F(0) })).toMatch(/no card/)
    expect(reason(state, { from: T(4), cardIndex: 0.5, to: F(0) })).toMatch(/no card/)
    expect(reason(state, { from: T(0), cardIndex: 0, to: T(3) })).toMatch(/face down/)
    expect(reason(state, { from: Locations.waste(), cardIndex: 0, to: T(0) })).toMatch(/top card/)
    expect(reason(state, { from: T(1), cardIndex: 1, to: F(0) })).toMatch(/one card at a time/)
    expect(reason(state, { from: T(6), cardIndex: 0, to: F(0) })).toMatch(
      /does not belong on the Hearts/,
    )
    expect(reason(state, { from: T(3), cardIndex: 0, to: F(1) })).toMatch(/Only an Ace/)
    expect(reason(state, { from: Locations.waste(), cardIndex: 1, to: F(0) })).toMatch(
      /cannot go on 2 of Hearts/,
    )
    expect(reason(state, { from: T(4), cardIndex: 0, to: T(2) })).toMatch(/Only a King/)
    expect(reason(state, { from: T(4), cardIndex: 0, to: T(3) })).toMatch(
      /cannot be placed on 7 of Diamonds/,
    )
    expect(reason(state, { from: T(4), cardIndex: 0, to: T(5) })).toMatch(/face-down card/)
  })

  it('rejects broken runs', () => {
    const broken = layout({ tableau: ['9S 8H 6C', '10D'] })
    expect(reason(broken, { from: T(0), cardIndex: 0, to: T(1) })).toMatch(/descending run/)
  })

  it('rejects moves from foundations to foundations of other suits', () => {
    const s = layout({ foundationRanks: [1, 0, 0, 0] })
    const move = { from: F(0) as PileLocation, cardIndex: 0, to: F(1) }
    expect(reason(s, move)).toMatch(/Hearts|Diamonds/)
  })
})
