import { describe, expect, it } from 'vitest'
import {
  autoMoveToFoundation,
  canAutoComplete,
  canPickUp,
  locateCard,
  canDraw,
  draw,
  findFoundationMove,
  listLegalMoves,
  moveCards,
  nextAutoCompleteMove,
  type EngineResult,
} from '@/domain/services/GameEngine'
import { Dealer } from '@/domain/services/Dealer'
import { allPlacedCards, type GameState } from '@/domain/models/GameState'
import { Locations } from '@/domain/types'
import { autoCompleteState, card, layout, nearWinState } from '@/testing/fixtures'
import { seededRandom } from '@/utils/random'

const T = Locations.tableau
const F = Locations.foundation

function ok(result: EngineResult) {
  if (!result.ok) throw new Error(result.reason)
  return result
}

const ids = (pile: GameState['stock']) => pile.map((p) => `${p.card.id}${p.faceUp ? '' : '#'}`)

describe('draw', () => {
  it('draws three cards face-up in draw-three mode', () => {
    const state = layout({ stock: 'AH 2H 3H 4H' })
    const result = ok(draw(state))
    expect(result.kind).toBe('draw')
    expect(ids(result.state.stock)).toEqual(['hearts-1#'])
    expect(ids(result.state.waste)).toEqual(['hearts-4', 'hearts-3', 'hearts-2'])
    expect(result.cards.map((c) => c.id)).toEqual(['hearts-4', 'hearts-3', 'hearts-2'])
    expect(result.state.moveCount).toBe(1)
    expect(state.stock).toHaveLength(4)
  })

  it('draws a single card in draw-one mode and the remainder when short', () => {
    expect(ids(ok(draw(layout({ stock: 'AH 2H', drawCount: 1 }))).state.waste)).toEqual([
      'hearts-2',
    ])
    expect(ids(ok(draw(layout({ stock: 'AH' }))).state.waste)).toEqual(['hearts-1'])
  })

  it('recycles the waste when the stock is empty', () => {
    const state = layout({ waste: 'AH 2H 3H' })
    const result = ok(draw(state))
    expect(result.kind).toBe('recycle')
    expect(ids(result.state.stock)).toEqual(['hearts-3#', 'hearts-2#', 'hearts-1#'])
    expect(result.state.waste).toHaveLength(0)
    expect(result.state.recycleCount).toBe(1)
    // Drawing again returns the original order.
    expect(ids(ok(draw({ ...result.state, drawCount: 1 })).state.waste)).toEqual(['hearts-1'])
  })

  it('fails with nothing to draw or after winning', () => {
    expect(draw(layout({}))).toEqual({ ok: false, reason: 'There are no cards left to draw.' })
    expect(draw({ ...layout({ stock: 'AH' }), status: 'won' }).ok).toBe(false)
    expect(canDraw(layout({}))).toBe(false)
    expect(canDraw(layout({ stock: 'AH' }))).toBe(true)
    expect(canDraw(layout({ waste: 'AH' }))).toBe(true)
    expect(canDraw({ ...layout({ stock: 'AH' }), status: 'won' })).toBe(false)
  })
})

describe('moveCards', () => {
  it('moves a run and reveals the exposed card', () => {
    const state = layout({ tableau: ['#8C #AD KH QS', ''] })
    const result = ok(moveCards(state, { from: T(0), cardIndex: 2, to: T(1) }))
    expect(ids(result.state.tableau[0]!)).toEqual(['clubs-8#', 'diamonds-1'])
    expect(ids(result.state.tableau[1]!)).toEqual(['hearts-13', 'spades-12'])
    expect(result.revealed).toBe(card('AD'))
    expect(result.cards).toEqual([card('KH'), card('QS')])
    expect(result.state.moveCount).toBe(1)
    expect(result.move).toEqual({ from: T(0), cardIndex: 2, to: T(1) })
  })

  it('does not report a reveal when the exposed card was already face-up', () => {
    const state = layout({ tableau: ['9H 8S', '9D'] })
    const result = ok(moveCards(state, { from: T(0), cardIndex: 1, to: T(1) }))
    expect(result.revealed).toBeUndefined()
  })

  it('moves waste and foundation cards', () => {
    const state = layout({ waste: 'AH', foundationRanks: [0, 0, 1, 0], tableau: ['2H'] })
    const fromWaste = ok(moveCards(state, { from: Locations.waste(), cardIndex: 0, to: F(0) }))
    expect(fromWaste.state.waste).toHaveLength(0)
    expect(ids(fromWaste.state.foundations[0]!)).toEqual(['hearts-1'])
    const fromFoundation = ok(moveCards(state, { from: F(2), cardIndex: 0, to: T(0) }))
    expect(fromFoundation.state.foundations[2]).toHaveLength(0)
    expect(fromFoundation.revealed).toBeUndefined()
  })

  it('rejects illegal moves', () => {
    const result = moveCards(layout({ tableau: ['2H', ''] }), {
      from: T(0),
      cardIndex: 0,
      to: T(1),
    })
    expect(result).toEqual({
      ok: false,
      reason: 'Only a King can be placed on an empty tableau pile.',
    })
  })

  it('detects a win', () => {
    const result = ok(moveCards(nearWinState(), { from: T(0), cardIndex: 0, to: F(3) }))
    expect(result.state.status).toBe('won')
    expect(result.state.moveCount).toBe(100)
  })
})

describe('foundation auto-move', () => {
  const state = layout({
    waste: 'AH',
    foundationRanks: [0, 1, 0, 0],
    tableau: ['2D', '#5C', '3S', ''],
  })

  it('finds foundation moves for waste and tableau', () => {
    expect(findFoundationMove(state, Locations.waste())).toEqual({
      from: Locations.waste(),
      cardIndex: 0,
      to: F(0),
    })
    expect(findFoundationMove(state, T(0))).toEqual({ from: T(0), cardIndex: 0, to: F(1) })
    expect(findFoundationMove(state, T(1))).toBeNull()
    expect(findFoundationMove(state, T(2))).toBeNull()
    expect(findFoundationMove(state, T(3))).toBeNull()
    expect(findFoundationMove(state, T(12))).toBeNull()
    expect(findFoundationMove(state, Locations.stock())).toBeNull()
    expect(findFoundationMove(state, F(1))).toBeNull()
  })

  it('auto-moves or explains why not', () => {
    expect(ok(autoMoveToFoundation(state, T(0))).state.foundations[1]).toHaveLength(2)
    expect(autoMoveToFoundation(state, T(2))).toEqual({
      ok: false,
      reason: '3 of Spades cannot go to a foundation yet.',
    })
    expect(autoMoveToFoundation(state, T(1))).toEqual({
      ok: false,
      reason: 'There is no card to move.',
    })
    expect(autoMoveToFoundation(state, T(3))).toEqual({
      ok: false,
      reason: 'There is no card to move.',
    })
    expect(autoMoveToFoundation(state, T(42))).toEqual({
      ok: false,
      reason: 'There is no card to move.',
    })
  })
})

describe('auto-complete', () => {
  it('detects when the game can finish itself', () => {
    expect(canAutoComplete(autoCompleteState())).toBe(true)
    expect(canAutoComplete(layout({ stock: 'AH' }))).toBe(false)
    expect(canAutoComplete(layout({ waste: 'AH' }))).toBe(false)
    expect(canAutoComplete(layout({ tableau: ['#AH 2S'] }))).toBe(false)
    expect(canAutoComplete({ ...autoCompleteState(), status: 'won' })).toBe(false)
  })

  it('plays the game out, lowest cards first', () => {
    let state = autoCompleteState()
    let steps = 0
    for (let move = nextAutoCompleteMove(state); move; move = nextAutoCompleteMove(state)) {
      const source = state.tableau[move.from.index]!
      expect(source[move.cardIndex]!.card.rank).toBe(11 + Math.floor(steps / 4))
      state = ok(moveCards(state, move)).state
      steps++
    }
    expect(steps).toBe(12)
    expect(state.status).toBe('won')
    expect(nextAutoCompleteMove(state)).toBeNull()
  })
})

describe('listLegalMoves', () => {
  it('lists every legal move', () => {
    const state = layout({
      waste: 'QH',
      foundationRanks: [1, 0, 0, 0],
      tableau: ['KS', '2H', '', 'JC'],
    })
    const moves = listLegalMoves(state)
    expect(moves).toContainEqual({ from: Locations.waste(), cardIndex: 0, to: T(0) })
    expect(moves).toContainEqual({ from: T(1), cardIndex: 0, to: F(0) })
    expect(moves).toContainEqual({ from: T(0), cardIndex: 0, to: T(2) })
    expect(moves.some((m) => m.from.type === 'foundation')).toBe(false)
    expect(moves.every((m) => !(m.to.type === 'tableau' && m.to.index === 3))).toBe(true)
  })

  it('returns nothing once won', () => {
    expect(listLegalMoves({ ...nearWinState(), status: 'won' })).toEqual([])
  })
})

describe('invariants (randomised play)', () => {
  it('never loses or duplicates cards across many random games', () => {
    for (let game = 0; game < 30; game++) {
      const random = seededRandom(game)
      let state = new Dealer().deal({ seed: game, drawCount: game % 2 ? 1 : 3 })
      for (let step = 0; step < 200 && state.status !== 'won'; step++) {
        const moves = listLegalMoves(state)
        const pick = Math.floor(random() * (moves.length + 1))
        const result = pick < moves.length ? moveCards(state, moves[pick]!) : draw(state)
        if (!result.ok) break
        state = result.state
        const all = allPlacedCards(state)
        expect(all).toHaveLength(52)
        expect(new Set(all.map((p) => p.card.id)).size).toBe(52)
        expect(state.stock.every((p) => !p.faceUp)).toBe(true)
        expect(state.waste.every((p) => p.faceUp)).toBe(true)
        state.tableau.forEach((pile) => {
          if (pile.length) expect(pile.at(-1)!.faceUp).toBe(true)
        })
      }
    }
  })
})

describe('locateCard', () => {
  it('finds cards in any pile', () => {
    const state = layout({
      stock: 'AH',
      waste: '2H',
      foundationRanks: [0, 1, 0, 0],
      tableau: ['', '5S 4H'],
    })
    expect(locateCard(state, 'hearts-1')).toEqual({ location: Locations.stock(), index: 0 })
    expect(locateCard(state, 'hearts-2')).toEqual({ location: Locations.waste(), index: 0 })
    expect(locateCard(state, 'diamonds-1')).toEqual({ location: F(1), index: 0 })
    expect(locateCard(state, 'hearts-4')).toEqual({ location: T(1), index: 1 })
    expect(locateCard(state, 'clubs-9')).toBeNull()
  })
})

describe('canPickUp', () => {
  const state = layout({
    stock: 'AH',
    waste: '2H 3C',
    foundationRanks: [0, 1, 0, 0],
    tableau: ['#9D 5S 4H', '8C 3D'],
  })
  it('allows runs and top cards', () => {
    expect(canPickUp(state, T(0), 1)).toBe(true)
    expect(canPickUp(state, T(0), 2)).toBe(true)
    expect(canPickUp(state, Locations.waste(), 1)).toBe(true)
    expect(canPickUp(state, F(1), 0)).toBe(true)
  })

  it('rejects everything else', () => {
    expect(canPickUp(state, T(0), 0)).toBe(false)
    expect(canPickUp(state, T(1), 0)).toBe(false)
    expect(canPickUp(state, T(0), 5)).toBe(false)
    expect(canPickUp(state, T(9), 0)).toBe(false)
    expect(canPickUp(state, Locations.waste(), 0)).toBe(false)
    expect(canPickUp(state, Locations.stock(), 0)).toBe(false)
    expect(canPickUp({ ...state, status: 'won' }, T(0), 2)).toBe(false)
  })
})
