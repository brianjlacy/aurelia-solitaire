import { describe, expect, it } from 'vitest'
import { KlondikeRules, klondikeRules } from '@/domain/services/GameRules'
import { Card } from '@/domain/models/Card'
import { FOUNDATION_SUITS } from '@/domain/models/GameState'
import { Rank, Suit } from '@/domain/types'
import { card, layout, pile } from '@/testing/fixtures'

describe('KlondikeRules', () => {
  const rules = new KlondikeRules()

  it('is named', () => {
    expect(klondikeRules.name).toBe('Klondike')
  })

  describe('canMoveToTableau', () => {
    it('should allow King on empty tableau', () => {
      expect(rules.canMoveToTableau(new Card(Suit.Hearts, Rank.King), [])).toBe(true)
    })

    it('should reject non-King on empty tableau', () => {
      expect(rules.canMoveToTableau(new Card(Suit.Hearts, Rank.Queen), [])).toBe(false)
    })

    it('should allow alternating color descending sequence', () => {
      expect(rules.canMoveToTableau(card('6S'), pile('7H'))).toBe(true)
    })

    it('should reject same colour, wrong rank and face-down targets', () => {
      expect(rules.canMoveToTableau(card('6D'), pile('7H'))).toBe(false)
      expect(rules.canMoveToTableau(card('5S'), pile('7H'))).toBe(false)
      expect(rules.canMoveToTableau(card('6S'), pile('#7H'))).toBe(false)
    })
  })

  describe('canMoveToFoundation', () => {
    it('accepts an Ace of the right suit on an empty foundation', () => {
      expect(rules.canMoveToFoundation(card('AH'), [], Suit.Hearts)).toBe(true)
      expect(rules.canMoveToFoundation(card('AS'), [], Suit.Hearts)).toBe(false)
      expect(rules.canMoveToFoundation(card('2H'), [], Suit.Hearts)).toBe(false)
    })

    it('accepts the next rank of the same suit', () => {
      expect(rules.canMoveToFoundation(card('2H'), pile('AH'), Suit.Hearts)).toBe(true)
      expect(rules.canMoveToFoundation(card('3H'), pile('AH'), Suit.Hearts)).toBe(false)
    })
  })

  describe('isMovableSequence', () => {
    it('accepts valid runs', () => {
      expect(rules.isMovableSequence(pile('KH'))).toBe(true)
      expect(rules.isMovableSequence(pile('KH QS JD'))).toBe(true)
    })

    it('rejects empty, broken or face-down runs', () => {
      expect(rules.isMovableSequence([])).toBe(false)
      expect(rules.isMovableSequence(pile('KH QD'))).toBe(false)
      expect(rules.isMovableSequence(pile('KH JS'))).toBe(false)
      expect(rules.isMovableSequence(pile('#KH QS'))).toBe(false)
    })
  })

  describe('hasWon', () => {
    it('should return true when all foundations have Kings', () => {
      expect(rules.hasWon(layout({ foundationRanks: [13, 13, 13, 13] }).foundations)).toBe(true)
    })

    it('should return false when any foundation is incomplete', () => {
      expect(rules.hasWon(layout({ foundationRanks: [13, 12, 13, 13] }).foundations)).toBe(false)
      expect(rules.hasWon(layout({}).foundations)).toBe(false)
    })
  })

  describe('findAutoMoveTarget', () => {
    it('finds the matching foundation', () => {
      const { foundations } = layout({ foundationRanks: [1, 0, 0, 0] })
      expect(rules.findAutoMoveTarget(card('2H'), foundations, FOUNDATION_SUITS)).toBe(0)
      expect(rules.findAutoMoveTarget(card('AC'), foundations, FOUNDATION_SUITS)).toBe(3)
      expect(rules.findAutoMoveTarget(card('3H'), foundations, FOUNDATION_SUITS)).toBe(-1)
    })
  })
})
