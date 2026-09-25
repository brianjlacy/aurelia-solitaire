import { describe, expect, it } from 'vitest'
import { deserializeGameState, serializeGameState } from '@/domain/services/Serializer'
import { Dealer } from '@/domain/services/Dealer'
import { layout, nearWinState } from '@/testing/fixtures'

describe('Serializer', () => {
  it('round-trips a deal', () => {
    const state = new Dealer().deal({ seed: 77 })
    const data = JSON.parse(JSON.stringify(serializeGameState(state)))
    expect(deserializeGameState(data)).toEqual(state)
  })

  it('round-trips a game in progress with a waste and foundations', () => {
    const state = {
      ...layout({
        waste: '5H',
        foundationRanks: [3, 0, 0, 1],
        tableau: ['#9D 8C'],
        fillStock: true,
      }),
      moveCount: 12,
      recycleCount: 2,
    }
    expect(deserializeGameState(serializeGameState(state))).toEqual(state)
    expect(serializeGameState(state).waste).toEqual(['hearts-5:u'])
  })

  it('round-trips a won game', () => {
    const won = { ...nearWinState(), status: 'won' as const }
    expect(deserializeGameState(serializeGameState(won))?.status).toBe('won')
  })

  const valid = () =>
    serializeGameState(new Dealer().deal({ seed: 1 })) as unknown as Record<string, unknown>

  it.each([
    ['non-object', () => 'nope'],
    ['missing stock', () => ({ ...valid(), stock: undefined })],
    ['non-string card', () => ({ ...valid(), waste: [1] })],
    ['bad card code', () => ({ ...valid(), waste: ['moons-1:u'] })],
    ['bad orientation', () => ({ ...valid(), waste: ['hearts-1:x'] })],
    [
      'duplicate card',
      () => {
        const d = valid()
        const stock = d.stock as string[]
        return { ...d, stock: [...stock.slice(1), stock[1]] }
      },
    ],
    [
      'missing card',
      () => {
        const d = valid()
        return { ...d, stock: (d.stock as string[]).slice(1) }
      },
    ],
    [
      'wrong tableau count',
      () => ({ ...valid(), tableau: (valid().tableau as string[][]).slice(1) }),
    ],
    ['tableau not array', () => ({ ...valid(), tableau: 'x' })],
    [
      'bad tableau pile',
      () => ({ ...valid(), tableau: [...(valid().tableau as string[][]).slice(1), 7] }),
    ],
    ['bad draw count', () => ({ ...valid(), drawCount: 2 })],
    ['negative moves', () => ({ ...valid(), moveCount: -1 })],
    ['bad recycle count', () => ({ ...valid(), recycleCount: 1.5 })],
    ['bad status', () => ({ ...valid(), status: 'lost' })],
    ['bad seed', () => ({ ...valid(), seed: -3 })],
    ['huge seed', () => ({ ...valid(), seed: 2 ** 40 })],
  ])('rejects %s', (_label, make) => {
    expect(deserializeGameState(make())).toBeNull()
  })

  it('accepts a null seed', () => {
    expect(deserializeGameState({ ...valid(), seed: null })?.seed).toBeNull()
  })

  it('rejects impossible orientations and foundations', () => {
    const base = serializeGameState(
      layout({ waste: '5H', foundationRanks: [2, 0, 0, 0], tableau: ['#9D 8C'], fillStock: true }),
    )
    const faceUpStock = {
      ...base,
      stock: base.stock.map((c, i) => (i === 0 ? c.replace(':d', ':u') : c)),
    }
    expect(deserializeGameState(faceUpStock)).toBeNull()
    const faceDownWaste = { ...base, waste: ['hearts-5:d'] }
    expect(deserializeGameState(faceDownWaste)).toBeNull()
    const wrongFoundation = { ...base, foundations: [['hearts-2:u', 'hearts-1:u'], [], [], []] }
    expect(deserializeGameState(wrongFoundation)).toBeNull()
    const hiddenTop = { ...base, tableau: [['diamonds-9:d', 'clubs-8:d'], [], [], [], [], [], []] }
    expect(deserializeGameState(hiddenTop)).toBeNull()
    const downAboveUp = {
      ...base,
      tableau: [['diamonds-9:u', 'clubs-8:d'], [], [], [], [], [], []],
    }
    expect(deserializeGameState(downAboveUp)).toBeNull()
  })
})
