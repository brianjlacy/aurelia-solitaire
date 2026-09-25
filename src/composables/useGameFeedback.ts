import { onBeforeUnmount } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { useUiStore } from '@/stores/uiStore'
import { useAnnouncer } from './useAnnouncer'
import { useAudio } from './useAudio'

/**
 * Connects game events to feedback channels: screen-reader announcements,
 * sound effects, invalid-move animations and the victory dialog.
 */
export function useGameFeedback({ winDialogDelayMs = 900 } = {}) {
  const game = useGameStore()
  const ui = useUiStore()
  const { announce } = useAnnouncer()
  const { play } = useAudio()
  let winTimer: ReturnType<typeof setTimeout> | undefined

  const unsubscribers = [
    game.events.on('game:new', ({ message, restored }) => {
      ui.clearSelection()
      if (!restored) play('shuffle')
      void announce(message)
    }),
    game.events.on('cards:drawn', ({ message }) => {
      play('flip')
      void announce(message)
    }),
    game.events.on('cards:moved', ({ message, revealed }) => {
      play(revealed ? 'flip' : 'place')
      void announce(message)
    }),
    game.events.on('move:invalid', ({ reason, cardId }) => {
      play('invalid')
      ui.flashInvalid(cardId ?? null)
      void announce(`Invalid move. ${reason}`)
    }),
    game.events.on('history:changed', ({ message }) => {
      ui.clearSelection()
      play('place')
      void announce(message)
    }),
    game.events.on('hint', ({ message }) => void announce(message)),
    game.events.on('game:won', ({ message }) => {
      ui.clearSelection()
      play('win')
      void announce(message)
      // Let the celebration animation play before the dialog covers the table.
      winTimer = setTimeout(() => ui.openModal('win'), winDialogDelayMs)
    }),
  ]

  onBeforeUnmount(() => {
    clearTimeout(winTimer)
    unsubscribers.forEach((off) => off())
  })
}
