import { describe, expect, it, vi } from 'vitest'
import { cryptoRandom, parseSeed, randomSeed, seededRandom } from '@/utils/random'
import { shuffle } from '@/utils/shuffle'
import { formatDuration, formatDurationSpoken, formatPercent, plural } from '@/utils/format'

describe('random', () => {
  it('is deterministic for a seed', () => {
    const a = seededRandom(42)
    const b = seededRandom(42)
    const seqA = Array.from({ length: 5 }, a)
    expect(seqA).toEqual(Array.from({ length: 5 }, b))
    expect(seqA.every((n) => n >= 0 && n < 1)).toBe(true)
    expect(Array.from({ length: 5 }, seededRandom(43))).not.toEqual(seqA)
  })

  it('uses crypto.getRandomValues', () => {
    const spy = vi.spyOn(globalThis.crypto, 'getRandomValues')
    const value = cryptoRandom()()
    expect(spy).toHaveBeenCalled()
    expect(value).toBeGreaterThanOrEqual(0)
    expect(value).toBeLessThan(1)
  })

  it('creates 32-bit seeds', () => {
    const seed = randomSeed()
    expect(Number.isInteger(seed)).toBe(true)
    expect(seed).toBeGreaterThanOrEqual(0)
    expect(seed).toBeLessThanOrEqual(0xffffffff)
  })

  it('parses seeds safely', () => {
    expect(parseSeed('123')).toBe(123)
    expect(parseSeed('0')).toBe(0)
    expect(parseSeed('4294967295')).toBe(4294967295)
    expect(parseSeed('4294967296')).toBeNull()
    expect(parseSeed('-1')).toBeNull()
    expect(parseSeed('abc')).toBeNull()
    expect(parseSeed('')).toBeNull()
    expect(parseSeed(null)).toBeNull()
    expect(parseSeed(undefined)).toBeNull()
  })
})

describe('shuffle', () => {
  it('returns a permutation without mutating the input', () => {
    const input = Array.from({ length: 52 }, (_, i) => i)
    const result = shuffle(input, seededRandom(7))
    expect(input).toEqual(Array.from({ length: 52 }, (_, i) => i))
    expect([...result].sort((a, b) => a - b)).toEqual(input)
    expect(result).not.toEqual(input)
  })

  it('is deterministic with a seeded source', () => {
    expect(shuffle([1, 2, 3, 4, 5], seededRandom(1))).toEqual(
      shuffle([1, 2, 3, 4, 5], seededRandom(1)),
    )
  })

  it('defaults to the crypto source', () => {
    expect(shuffle([1, 2, 3]).sort()).toEqual([1, 2, 3])
    expect(shuffle([])).toEqual([])
  })
})

describe('format', () => {
  it('formats durations', () => {
    expect(formatDuration(0)).toBe('00:00')
    expect(formatDuration(42_000)).toBe('00:42')
    expect(formatDuration(65_999)).toBe('01:05')
    expect(formatDuration(3_725_000)).toBe('1:02:05')
    expect(formatDuration(-5)).toBe('00:00')
  })

  it('formats spoken durations', () => {
    expect(formatDurationSpoken(0)).toBe('0 seconds')
    expect(formatDurationSpoken(1000)).toBe('1 second')
    expect(formatDurationSpoken(65_000)).toBe('1 minute 5 seconds')
    expect(formatDurationSpoken(3_600_000)).toBe('1 hour')
    expect(formatDurationSpoken(7_320_000)).toBe('2 hours 2 minutes')
    expect(formatDurationSpoken(-1)).toBe('0 seconds')
  })

  it('pluralises and formats percentages', () => {
    expect(plural(1, 'move')).toBe('1 move')
    expect(plural(2, 'move')).toBe('2 moves')
    expect(formatPercent(0.456)).toBe('46%')
  })
})
