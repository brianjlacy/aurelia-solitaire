import { describe, expect, it } from 'vitest'
import { describeResult, pileName } from '@/stores/describe'
import { draw, moveCards } from '@/domain/services/GameEngine'
import { Locations } from '@/domain/types'
import { layout } from '@/testing/fixtures'
import type { EngineResult } from '@/domain/services/GameEngine'

const ok = (r: EngineResult) => {
  if (!r.ok) throw new Error(r.reason)
  return r
}

describe('describe', () => {
  it('names piles', () => {
    expect(pileName(Locations.stock())).toBe('the stock')
    expect(pileName(Locations.waste())).toBe('the waste')
    expect(pileName(Locations.foundation(0))).toBe('the Hearts foundation')
    expect(pileName(Locations.foundation(3))).toBe('the Clubs foundation')
    expect(pileName(Locations.tableau(2))).toBe('column 3')
  })

  it('describes draws and recycles', () => {
    expect(describeResult(ok(draw(layout({ stock: 'AH 2H 3H 4H' }))))).toBe(
      'Drew 3 cards. 2 of Hearts is on top of the waste.',
    )
    expect(describeResult(ok(draw(layout({ waste: 'AH' }))))).toBe(
      'Turned the waste over. 1 card back in the stock.',
    )
  })

  it('describes moves and reveals', () => {
    const state = layout({ tableau: ['#2C KH QS', ''], foundationRanks: [0, 0, 0, 0], waste: 'AH' })
    expect(
      describeResult(
        ok(
          moveCards(state, { from: Locations.tableau(0), cardIndex: 1, to: Locations.tableau(1) }),
        ),
      ),
    ).toBe('Moved card: King of Hearts and 1 more card to column 2. Revealed 2 of Clubs.')
    expect(
      describeResult(
        ok(
          moveCards(state, { from: Locations.waste(), cardIndex: 0, to: Locations.foundation(0) }),
        ),
      ),
    ).toBe('Moved card: Ace of Hearts to the Hearts foundation.')
  })
})
