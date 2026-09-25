import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  isNonNegativeInteger,
  isNonNegativeNumber,
  isRecord,
  PersistedValue,
} from '@/utils/storage'

export interface Statistics {
  gamesPlayed: number
  gamesWon: number
  /** Fastest win in milliseconds, `null` until the first win. */
  bestTimeMs: number | null
  /** Fewest moves in a win, `null` until the first win. */
  fewestMoves: number | null
  currentStreak: number
  bestStreak: number
  totalPlayTimeMs: number
}

export const EMPTY_STATISTICS: Readonly<Statistics> = Object.freeze({
  gamesPlayed: 0,
  gamesWon: 0,
  bestTimeMs: null,
  fewestMoves: null,
  currentStreak: 0,
  bestStreak: 0,
  totalPlayTimeMs: 0,
})

/** Type guard validating statistics read from storage. */
export function isValidStatistics(data: unknown): data is Statistics {
  if (!isRecord(data)) return false
  const nullableInt = (v: unknown) => v === null || isNonNegativeNumber(v)
  return (
    isNonNegativeInteger(data.gamesPlayed) &&
    isNonNegativeInteger(data.gamesWon) &&
    data.gamesWon <= data.gamesPlayed &&
    nullableInt(data.bestTimeMs) &&
    nullableInt(data.fewestMoves) &&
    isNonNegativeInteger(data.currentStreak) &&
    isNonNegativeInteger(data.bestStreak) &&
    isNonNegativeNumber(data.totalPlayTimeMs)
  )
}

export const STATS_STORAGE_KEY = 'solitaire-stats'

/** Lifetime statistics, persisted (with a backup copy) to localStorage. */
export const useStatsStore = defineStore('stats', () => {
  const persisted = new PersistedValue<Statistics>({
    key: STATS_STORAGE_KEY,
    version: 1,
    backup: true,
    validate: (data) => (isValidStatistics(data) ? data : null),
  })

  const stats = ref<Statistics>({ ...EMPTY_STATISTICS, ...persisted.load() })

  function commit(patch: Partial<Statistics>): void {
    stats.value = { ...stats.value, ...patch }
    persisted.save(stats.value)
  }

  /** Called on the first move of a deal. */
  function recordGameStarted(): void {
    commit({ gamesPlayed: stats.value.gamesPlayed + 1 })
  }

  /** Called when a deal is won. */
  function recordWin({ timeMs, moves }: { timeMs: number; moves: number }): void {
    const s = stats.value
    const currentStreak = s.currentStreak + 1
    commit({
      gamesWon: s.gamesWon + 1,
      currentStreak,
      bestStreak: Math.max(s.bestStreak, currentStreak),
      bestTimeMs: s.bestTimeMs === null ? timeMs : Math.min(s.bestTimeMs, timeMs),
      fewestMoves: s.fewestMoves === null ? moves : Math.min(s.fewestMoves, moves),
      totalPlayTimeMs: s.totalPlayTimeMs + timeMs,
    })
  }

  /** Called when a started deal is abandoned. */
  function recordLoss({ timeMs }: { timeMs: number }): void {
    commit({ currentStreak: 0, totalPlayTimeMs: stats.value.totalPlayTimeMs + timeMs })
  }

  function reset(): void {
    stats.value = { ...EMPTY_STATISTICS }
    persisted.clear()
  }

  return {
    stats: computed(() => stats.value),
    winRate: computed(() =>
      stats.value.gamesPlayed === 0 ? 0 : stats.value.gamesWon / stats.value.gamesPlayed,
    ),
    recordGameStarted,
    recordWin,
    recordLoss,
    reset,
  }
})
