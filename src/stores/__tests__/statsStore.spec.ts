import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  EMPTY_STATISTICS,
  isValidStatistics,
  STATS_STORAGE_KEY,
  useStatsStore,
} from '@/stores/statsStore'

describe('statsStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('tracks games, wins, streaks and records', () => {
    const store = useStatsStore()
    expect(store.winRate).toBe(0)
    store.recordGameStarted()
    store.recordWin({ timeMs: 90_000, moves: 120 })
    store.recordGameStarted()
    store.recordWin({ timeMs: 120_000, moves: 100 })
    store.recordGameStarted()
    store.recordLoss({ timeMs: 30_000 })
    expect(store.stats).toEqual({
      gamesPlayed: 3,
      gamesWon: 2,
      bestTimeMs: 90_000,
      fewestMoves: 100,
      currentStreak: 0,
      bestStreak: 2,
      totalPlayTimeMs: 240_000,
    })
    expect(store.winRate).toBeCloseTo(2 / 3)
  })

  it('persists with a backup and restores', () => {
    const store = useStatsStore()
    store.recordGameStarted()
    expect(localStorage.getItem(STATS_STORAGE_KEY)).not.toBeNull()
    localStorage.setItem(STATS_STORAGE_KEY, 'corrupted')
    setActivePinia(createPinia())
    expect(useStatsStore().stats.gamesPlayed).toBe(1)
  })

  it('resets', () => {
    const store = useStatsStore()
    store.recordGameStarted()
    store.reset()
    expect(store.stats).toEqual(EMPTY_STATISTICS)
    expect(localStorage.getItem(STATS_STORAGE_KEY)).toBeNull()
  })
})

describe('isValidStatistics', () => {
  it('validates the schema', () => {
    expect(isValidStatistics({ ...EMPTY_STATISTICS })).toBe(true)
    expect(isValidStatistics({ ...EMPTY_STATISTICS, bestTimeMs: 5, fewestMoves: 3 })).toBe(true)
    expect(isValidStatistics(null)).toBe(false)
    expect(isValidStatistics({ ...EMPTY_STATISTICS, gamesPlayed: -1 })).toBe(false)
    expect(isValidStatistics({ ...EMPTY_STATISTICS, gamesWon: 2 })).toBe(false)
    expect(isValidStatistics({ ...EMPTY_STATISTICS, bestTimeMs: 'fast' })).toBe(false)
    expect(isValidStatistics({ ...EMPTY_STATISTICS, totalPlayTimeMs: Infinity })).toBe(false)
  })
})
