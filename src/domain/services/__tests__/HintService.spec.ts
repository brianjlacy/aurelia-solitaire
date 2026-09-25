import { describe, expect, it } from 'vitest'
import { findHints, getBestHint } from '@/domain/services/HintService'
import { Locations } from '@/domain/types'
import { layout, nearWinState } from '@/testing/fixtures'

const T = Locations.tableau

describe('HintService', () => {
  it('prefers foundation moves', () => {
    const hint = getBestHint(nearWinState())
    expect(hint?.kind).toBe('foundation')
    expect(hint?.description).toBe('Move King of Clubs to the foundation.')
    expect(hint?.move).toEqual({ from: T(0), cardIndex: 0, to: Locations.foundation(3) })
  })

  it('suggests moves that reveal face-down cards over waste moves', () => {
    const state = layout({ waste: '6D', tableau: ['#2C 8H', '9S', '7S'] })
    const hints = findHints(state)
    expect(hints[0]).toMatchObject({
      kind: 'reveal',
      description: 'Move 8 of Hearts onto 9 of Spades.',
    })
    expect(hints[1]).toMatchObject({
      kind: 'waste',
      description: 'Move 6 of Diamonds onto 7 of Spades.',
    })
  })

  it('suggests Kings for empty columns only when that reveals a card', () => {
    const useful = findHints(layout({ tableau: ['#2C KH', ''] }))
    expect(useful[0]).toMatchObject({
      kind: 'empty-column',
      description: 'Move King of Hearts to the empty column.',
    })
    const pointless = findHints(layout({ tableau: ['KH', ''] }))
    expect(pointless).toEqual([])
    const nonKing = findHints(layout({ tableau: ['#2C QH', ''] }))
    expect(nonKing).toEqual([])
  })

  it('suggests splitting a run only when it frees a foundation card', () => {
    const helpful = findHints(
      layout({ foundationRanks: [7, 0, 0, 0], tableau: ['#4C 9S 8H 7C', '8D'] }),
    )
    expect(helpful.find((h) => h.kind === 'build')?.description).toBe(
      'Move 7 of Clubs onto 8 of Diamonds.',
    )
    const pointless = findHints(layout({ tableau: ['9H 8S 7H', '8C'] }))
    expect(pointless).toEqual([])
  })

  it('never suggests pulling cards back off a foundation or shuffling runs', () => {
    const hints = findHints(
      layout({ foundationRanks: [0, 0, 1, 0], tableau: ['2H', 'KS', '8D', '9C'] }),
    )
    expect(hints.every((h) => h.move?.from.type !== 'foundation')).toBe(true)
    // 8D onto 9C would not reveal anything (8D is the only card): not suggested.
    expect(hints).toEqual([])
  })

  it('falls back to drawing or recycling', () => {
    expect(getBestHint(layout({ stock: 'AH' }))).toMatchObject({ kind: 'draw' })
    expect(getBestHint(layout({ waste: '5H' }))).toMatchObject({ kind: 'recycle' })
    expect(getBestHint(layout({}))).toBeNull()
  })

  it('offers nothing once won', () => {
    expect(findHints({ ...nearWinState(), status: 'won' })).toEqual([])
  })
})
