import { describe, expect, it } from 'vitest'
import {
  ALL_RANKS,
  ALL_SUITS,
  isRank,
  isRedSuit,
  isSuit,
  locationKey,
  Locations,
  Rank,
  rankLongName,
  rankShortName,
  sameLocation,
  Suit,
  SUIT_NAMES,
  SUIT_SYMBOLS,
} from '@/domain/types'

describe('Suit', () => {
  it('lists four suits with symbols and names', () => {
    expect(ALL_SUITS).toHaveLength(4)
    expect(SUIT_SYMBOLS[Suit.Hearts]).toBe('♥')
    expect(SUIT_SYMBOLS[Suit.Spades]).toBe('♠')
    expect(SUIT_NAMES[Suit.Clubs]).toBe('Clubs')
  })

  it('knows which suits are red', () => {
    expect(isRedSuit(Suit.Hearts)).toBe(true)
    expect(isRedSuit(Suit.Diamonds)).toBe(true)
    expect(isRedSuit(Suit.Clubs)).toBe(false)
    expect(isRedSuit(Suit.Spades)).toBe(false)
  })

  it('guards suit values', () => {
    expect(isSuit('hearts')).toBe(true)
    expect(isSuit('stars')).toBe(false)
    expect(isSuit(1)).toBe(false)
  })
})

describe('Rank', () => {
  it('lists thirteen ranks from Ace to King', () => {
    expect(ALL_RANKS).toHaveLength(13)
    expect(ALL_RANKS[0]).toBe(Rank.Ace)
    expect(ALL_RANKS[12]).toBe(Rank.King)
  })

  it('names ranks', () => {
    expect(rankShortName(Rank.Ace)).toBe('A')
    expect(rankShortName(Rank.Ten)).toBe('10')
    expect(rankShortName(Rank.Queen)).toBe('Q')
    expect(rankLongName(Rank.Jack)).toBe('Jack')
    expect(rankLongName(Rank.Seven)).toBe('7')
  })

  it('guards rank values', () => {
    expect(isRank(1)).toBe(true)
    expect(isRank(13)).toBe(true)
    expect(isRank(0)).toBe(false)
    expect(isRank(14)).toBe(false)
    expect(isRank(2.5)).toBe(false)
    expect(isRank('3')).toBe(false)
  })
})

describe('PileLocation', () => {
  it('builds and compares locations', () => {
    expect(Locations.stock()).toEqual({ type: 'stock', index: 0 })
    expect(Locations.waste()).toEqual({ type: 'waste', index: 0 })
    expect(sameLocation(Locations.tableau(2), Locations.tableau(2))).toBe(true)
    expect(sameLocation(Locations.tableau(2), Locations.tableau(3))).toBe(false)
    expect(sameLocation(Locations.tableau(0), Locations.foundation(0))).toBe(false)
    expect(locationKey(Locations.foundation(3))).toBe('foundation-3')
  })
})
