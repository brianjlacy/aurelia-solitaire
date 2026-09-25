import { describe, expect, it } from 'vitest'
import { Dealer } from '@/domain/services/Dealer'
import { GameBuilder } from '@/domain/builders/GameBuilder'
import { allPlacedCards } from '@/domain/models/GameState'
import { seededRandom } from '@/utils/random'

describe('Dealer', () => {
  it('deals a standard Klondike layout', () => {
    const state = new Dealer().deal()
    expect(state.tableau).toHaveLength(7)
    state.tableau.forEach((pile, i) => {
      expect(pile).toHaveLength(i + 1)
      expect(pile.at(-1)?.faceUp).toBe(true)
      expect(pile.slice(0, -1).every((p) => !p.faceUp)).toBe(true)
    })
    expect(state.stock).toHaveLength(24)
    expect(state.stock.every((p) => !p.faceUp)).toBe(true)
    expect(state.waste).toHaveLength(0)
    expect(state.foundations.every((f) => f.length === 0)).toBe(true)
    expect(state.moveCount).toBe(0)
    expect(state.status).toBe('playing')
    expect(state.drawCount).toBe(3)
    expect(state.seed).toBeNull()
  })

  it('uses every card exactly once', () => {
    const ids = allPlacedCards(new Dealer().deal()).map((p) => p.card.id)
    expect(ids).toHaveLength(52)
    expect(new Set(ids).size).toBe(52)
  })

  it('is reproducible with a seed', () => {
    const a = new Dealer().deal({ seed: 1234, drawCount: 1 })
    const b = new Dealer().deal({ seed: 1234, drawCount: 1 })
    expect(a).toEqual(b)
    expect(a.seed).toBe(1234)
    expect(a.drawCount).toBe(1)
    expect(new Dealer().deal({ seed: 1235 })).not.toEqual(a)
  })

  it('accepts a custom random source', () => {
    const a = new Dealer().deal({ random: seededRandom(5) })
    const b = new Dealer().deal({ random: seededRandom(5) })
    expect(a.tableau).toEqual(b.tableau)
  })
})

describe('GameBuilder', () => {
  it('builds deals fluently', () => {
    const state = new GameBuilder().withDrawCount(1).withSeed(99).build()
    expect(state.drawCount).toBe(1)
    expect(state.seed).toBe(99)
    expect(new GameBuilder().withSeed(99).withDrawCount(1).build()).toEqual(state)
    expect(new GameBuilder().withSeed(null).build().seed).toBeNull()
  })

  it('accepts a random source', () => {
    const a = new GameBuilder().withRandom(seededRandom(3)).build()
    const b = new GameBuilder().withRandom(seededRandom(3)).build()
    expect(a.tableau).toEqual(b.tableau)
  })
})
