<script setup lang="ts">
import { useTimer } from '@/composables/useTimer'
import { useGameStore } from '@/stores/gameStore'
import { useSettingsStore } from '@/stores/settingsStore'
import GameControls from './GameControls.vue'
import MoveCounter from './MoveCounter.vue'
import TimerDisplay from './TimerDisplay.vue'

const emit = defineEmits<{
  (e: 'new-game' | 'undo' | 'redo' | 'hint' | 'auto-complete' | 'stats' | 'settings' | 'help'): void
}>()

const game = useGameStore()
const settings = useSettingsStore()
const { elapsed, elapsedSpoken } = useTimer()
</script>

<template>
  <header
    class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-[var(--board-padding)] py-2 backdrop-blur-sm"
    style="background: var(--header-bg)"
  >
    <div class="flex items-center gap-4">
      <h1 class="text-lg font-bold tracking-tight whitespace-nowrap sm:text-xl">
        <span aria-hidden="true" class="mr-1">♠</span>Klondike Solitaire
      </h1>
      <div class="flex items-center gap-4" aria-label="Game status" role="group">
        <TimerDisplay v-if="settings.showTimer" :elapsed="elapsed" :spoken="elapsedSpoken" />
        <MoveCounter :count="game.moveCount" />
      </div>
    </div>
    <GameControls
      :can-undo="game.canUndo"
      :can-redo="game.canRedo"
      :can-hint="game.isPlaying && game.hintsRemaining !== 0"
      :can-auto-complete="game.canAutoComplete"
      :hints-remaining="game.hintsRemaining"
      @new-game="emit('new-game')"
      @undo="emit('undo')"
      @redo="emit('redo')"
      @hint="emit('hint')"
      @auto-complete="emit('auto-complete')"
      @stats="emit('stats')"
      @settings="emit('settings')"
      @help="emit('help')"
    />
  </header>
</template>
