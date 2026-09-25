<script setup lang="ts">
import { onMounted, provide } from 'vue'
import { useBoardController } from '@/composables/useBoardController'
import { useDragDrop } from '@/composables/useDragDrop'
import { useGameFeedback } from '@/composables/useGameFeedback'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
import { useGameStore } from '@/stores/gameStore'
import { useUiStore } from '@/stores/uiStore'
import { parseSeed } from '@/utils/random'
import GameModals from '../modals/GameModals.vue'
import DragLayer from './DragLayer.vue'
import GameHeader from './GameHeader.vue'
import GameTable from './GameTable.vue'
import { BOARD_CONTEXT } from './boardContext'

const game = useGameStore()
const ui = useUiStore()
const { drag, cancel: cancelDrag } = useDragDrop()

provide(BOARD_CONTEXT, useBoardController())
useGameFeedback()

function requestNewGame(): void {
  if (game.isPlaying && game.moveCount > 0) ui.openModal('confirm-new')
  else startNewGame()
}

function startNewGame(): void {
  ui.closeModal()
  game.newGame()
}

function restartDeal(): void {
  ui.closeModal()
  game.restartGame()
}

useKeyboardShortcuts({
  undo: () => game.undo(),
  redo: () => game.redo(),
  newGame: requestNewGame,
  hint: () => game.hint(),
  help: () => ui.openModal('help'),
  escape: () => {
    cancelDrag()
    ui.clearSelection()
    game.clearHint()
  },
  disabled: () => ui.modal !== null,
})

onMounted(() => {
  const seed = parseSeed(new URLSearchParams(window.location.search).get('seed'))
  game.init({ seed })
})
</script>

<template>
  <div class="game-board flex min-h-dvh flex-col">
    <GameHeader
      @new-game="requestNewGame"
      @undo="game.undo()"
      @redo="game.redo()"
      @hint="game.hint()"
      @auto-complete="game.autoComplete()"
      @stats="ui.openModal('stats')"
      @settings="ui.openModal('settings')"
      @help="ui.openModal('help')"
    />
    <main id="main" class="flex-1" tabindex="-1">
      <GameTable :state="game.state" :hint="game.activeHint" :generation="game.generation" />
    </main>
    <DragLayer :drag="drag" :state="game.state" />
    <GameModals
      :modal="ui.modal"
      :draw-count="game.state.drawCount"
      @close="ui.closeModal()"
      @open="ui.openModal"
      @confirm-new-game="startNewGame"
      @restart="restartDeal"
    />
  </div>
</template>
