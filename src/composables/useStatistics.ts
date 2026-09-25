import { computed } from 'vue'
import { useStatsStore } from '@/stores/statsStore'
import { formatDuration, formatPercent } from '@/utils/format'

/** Formatted statistics for display. */
export function useStatistics() {
  const store = useStatsStore()

  const rows = computed(() => {
    const s = store.stats
    return [
      { key: 'played', label: 'Games played', value: String(s.gamesPlayed) },
      { key: 'won', label: 'Games won', value: String(s.gamesWon) },
      { key: 'rate', label: 'Win rate', value: formatPercent(store.winRate) },
      {
        key: 'best-time',
        label: 'Best time',
        value: s.bestTimeMs === null ? '—' : formatDuration(s.bestTimeMs),
      },
      {
        key: 'fewest',
        label: 'Fewest moves',
        value: s.fewestMoves === null ? '—' : String(s.fewestMoves),
      },
      { key: 'streak', label: 'Current streak', value: String(s.currentStreak) },
      { key: 'best-streak', label: 'Best streak', value: String(s.bestStreak) },
      { key: 'total', label: 'Total playtime', value: formatDuration(s.totalPlayTimeMs) },
    ]
  })

  return { rows, reset: store.reset }
}
