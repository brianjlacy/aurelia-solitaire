import { describe, expect, it } from 'vitest'
import { Card, createDeck } from '@/domain/models/Card'
import { Rank, Suit } from '@/domain/types'

describe('Card', () => {
  describe('color detection', () => {
    it('should identify red cards correctly', () => {
      const card = new Card(Suit.Hearts, Rank.Ace)
      expect(card.isRed).toBe(true)
      expect(card.isBlack).toBe(false)
    })

    it('should identify black cards correctly', () => {
      const card = new Card(Suit.Spades, Rank.King)
      expect(card.isBlack).toBe(true)
      expect(card.isRed).toBe(false)
    })
  })

  describe('labels', () => {
    it('builds id, names and symbols', () => {
      const card = new Card(Suit.Hearts, Rank.Ace)
      expect(card.id).toBe('hearts-1')
      expect(card.displayRank).toBe('A')
      expect(card.suitSymbol).toBe('♥')
      expect(card.name).toBe('Ace of Hearts')
      expect(card.shortName).toBe('A♥')
      expect(new Card(Suit.Spades, Rank.Ten).name).toBe('10 of Spades')
      expect(new Card(Suit.Clubs, Rank.Queen).displayRank).toBe('Q')
    })
  })

  describe('immutability', () => {
    it('is frozen', () => {
      const card = new Card(Suit.Clubs, Rank.Two)
      expect(Object.isFrozen(card)).toBe(true)
      expect(() => {
        ;(card as { rank: Rank }).rank = Rank.King
      }).toThrow()
    })
  })

  describe('equals', () => {
    it('compares by id', () => {
      expect(new Card(Suit.Clubs, Rank.Two).equals(Card.of(Suit.Clubs, Rank.Two))).toBe(true)
      expect(new Card(Suit.Clubs, Rank.Two).equals(Card.of(Suit.Clubs, Rank.Three))).toBe(false)
    })
  })

  describe('canStackOn', () => {
    it('should allow stacking descending ranks with alternating colors on tableau', () => {
      const redQueen = new Card(Suit.Hearts, Rank.Queen)
      const blackJack = new Card(Suit.Spades, Rank.Jack)
      expect(blackJack.canStackOn(redQueen, false)).toBe(true)
    })

    it('should reject same color on tableau', () => {
      const redQueen = new Card(Suit.Hearts, Rank.Queen)
      const redJack = new Card(Suit.Diamonds, Rank.Jack)
      expect(redJack.canStackOn(redQueen, false)).toBe(false)
    })

    it('should reject wrong rank on tableau', () => {
      expect(
        new Card(Suit.Spades, Rank.Ten).canStackOn(new Card(Suit.Hearts, Rank.Queen), false),
      ).toBe(false)
    })

    it('should allow ascending same suit on foundation', () => {
      const heartsAce = new Card(Suit.Hearts, Rank.Ace)
      const heartsTwo = new Card(Suit.Hearts, Rank.Two)
      expect(heartsTwo.canStackOn(heartsAce, true)).toBe(true)
    })

    it('should reject other suits or ranks on foundation', () => {
      const heartsAce = new Card(Suit.Hearts, Rank.Ace)
      expect(new Card(Suit.Diamonds, Rank.Two).canStackOn(heartsAce, true)).toBe(false)
      expect(new Card(Suit.Hearts, Rank.Three).canStackOn(heartsAce, true)).toBe(false)
    })
  })

  describe('registry', () => {
    it('returns shared instances', () => {
      expect(Card.of(Suit.Spades, Rank.Ace)).toBe(Card.of(Suit.Spades, Rank.Ace))
      expect(Card.fromId('spades-1')).toBe(Card.of(Suit.Spades, Rank.Ace))
    })

    it('rejects unknown ids', () => {
      expect(Card.fromId('stars-1')).toBeUndefined()
      expect(Card.fromId(42)).toBeUndefined()
    })

    it('validates suit/rank pairs', () => {
      expect(Card.isValid('hearts', 13)).toBe(true)
      expect(Card.isValid('hearts', 14)).toBe(false)
      expect(Card.isValid('moons', 1)).toBe(false)
    })
  })

  describe('createDeck', () => {
    it('creates 52 unique cards', () => {
      const deck = createDeck()
      expect(deck).toHaveLength(52)
      expect(new Set(deck.map((c) => c.id)).size).toBe(52)
    })

    it('returns a new array each time', () => {
      expect(createDeck()).not.toBe(createDeck())
    })
  })
})
