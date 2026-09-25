import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { formatDuration, formatDurationSpoken } from '@/utils/format'

/**
 * Drives the game clock: ticks once per second while running and pauses
 * while the page is hidden. Returns formatted elapsed time.
 */
export function useTimer(intervalMs = 1000) {
  const game = useGameStore()
  let handle: ReturnType<typeof setInterval> | undefined

  function stop(): void {
    clearInterval(handle)
    handle = undefined
  }

  function sync(running: boolean): void {
    stop()
    if (running) handle = setInterval(() => game.tick(), intervalMs)
  }

  function onVisibilityChange(): void {
    if (document.visibilityState === 'hidden') game.pause()
    else game.resume()
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', game.pause)
  })

  onBeforeUnmount(() => {
    stop()
    document.removeEventListener('visibilitychange', onVisibilityChange)
    window.removeEventListener('pagehide', game.pause)
  })

  watch(() => game.isTimerRunning, sync, { immediate: true })

  return {
    elapsed: computed(() => formatDuration(game.elapsedMs)),
    elapsedSpoken: computed(() => formatDurationSpoken(game.elapsedMs)),
  }
}
