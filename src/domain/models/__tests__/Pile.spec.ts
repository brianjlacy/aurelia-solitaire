import { describe, expect, it } from 'vitest'
import {
  allPlacedCards,
  emptyGameState,
  faceDownCount,
  firstFaceUpIndex,
  isEmpty,
  revealTop,
  splitAt,
  topOf,
} from '@/domain/models'
import { card, pile } from '@/testing/fixtures'

describe('Pile helpers', () => {
  it('finds the top card', () => {
    expect(topOf(pile('AH 2S'))?.card).toBe(card('2S'))
    expect(topOf([])).toBeUndefined()
  })

  it('detects empty piles', () => {
    expect(isEmpty([])).toBe(true)
    expect(isEmpty(pile('AH'))).toBe(false)
  })

  it('locates the first face-up card', () => {
    expect(firstFaceUpIndex(pile('#AH #2S 3D'))).toBe(2)
    expect(firstFaceUpIndex(pile('#AH'))).toBe(1)
    expect(faceDownCount(pile('#AH #2S 3D'))).toBe(2)
  })

  it('reveals the top card only when needed', () => {
    const hidden = pile('#AH #2S')
    const revealed = revealTop(hidden)
    expect(revealed[1]).toEqual({ card: card('2S'), faceUp: true })
    expect(revealed[0]?.faceUp).toBe(false)
    expect(hidden[1]?.faceUp).toBe(false)
    const up = pile('AH')
    expect(revealTop(up)).toBe(up)
    const empty = pile('')
    expect(revealTop(empty)).toBe(empty)
  })

  it('splits piles', () => {
    const [rest, taken] = splitAt(pile('AH 2S 3D'), 1)
    expect(rest.map((p) => p.card.id)).toEqual(['hearts-1'])
    expect(taken.map((p) => p.card.id)).toEqual(['spades-2', 'diamonds-3'])
    expect(() => splitAt(pile('AH'), 1)).toThrow(RangeError)
    expect(() => splitAt(pile('AH'), -1)).toThrow(RangeError)
  })
})

describe('GameState helpers', () => {
  it('creates an empty table', () => {
    const state = emptyGameState()
    expect(state.tableau).toHaveLength(7)
    expect(state.foundations).toHaveLength(4)
    expect(state.drawCount).toBe(3)
    expect(state.status).toBe('idle')
    expect(emptyGameState(1).drawCount).toBe(1)
    expect(allPlacedCards(state)).toEqual([])
  })
})
