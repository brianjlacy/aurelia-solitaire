import { computed } from 'vue'
import { locationKey, sameLocation, type PileLocation } from '@/domain/types/PileType'
import { pileAt } from '@/domain/services/MoveValidator'
import { useGameStore } from '@/stores/gameStore'
import { useUiStore } from '@/stores/uiStore'
import type { BoardContext, DropState } from '@/components/game/boardContext'
import { useAnnouncer } from './useAnnouncer'
import { useDragDrop } from './useDragDrop'
import { useGameRules } from './useGameRules'

/**
 * Implements the board's interaction model shared by mouse, touch and
 * keyboard: tap/Enter to pick up a card, tap/Enter on a pile to drop it,
 * double-click to send to a foundation, and drag-and-drop.
 */
export function useBoardController(): BoardContext {
  const game = useGameStore()
  const ui = useUiStore()
  const dnd = useDragDrop()
  const rules = useGameRules()
  const { announce } = useAnnouncer()

  function cardsAt(location: PileLocation) {
    return pileAt(game.state, location) ?? []
  }

  function select(location: PileLocation, index: number): void {
    ui.select(location, index)
    const pile = cardsAt(location)
    const extra = pile.length - 1 - index
    const name = pile[index]!.card.name
    void announce(
      `Selected ${name}${extra > 0 ? ` and ${extra} card${extra === 1 ? '' : 's'} on it` : ''}. Choose a destination.`,
    )
  }

  /** Attempts to drop the selection on `location`; reports invalid moves. */
  function dropSelectionOn(location: PileLocation): void {
    const selection = ui.selection!
    ui.clearSelection()
    game.move({ from: selection.location, cardIndex: selection.index, to: location })
  }

  function handleCard(location: PileLocation, index: number): void {
    game.clearHint()
    const selection = ui.selection
    if (!selection) {
      if (game.canPickUp(location, index)) select(location, index)
      return
    }
    if (sameLocation(selection.location, location)) {
      if (selection.index !== index && game.canPickUp(location, index)) {
        select(location, index)
      } else {
        ui.clearSelection()
        void announce('Selection cleared.')
      }
      return
    }
    const valid = game.validate({
      from: selection.location,
      cardIndex: selection.index,
      to: location,
    }).valid
    if (!valid && game.canPickUp(location, index)) {
      select(location, index)
      return
    }
    dropSelectionOn(location)
  }

  const context: BoardContext = {
    onCardClick(location, index) {
      if (dnd.shouldSuppressClick()) return
      handleCard(location, index)
    },
    onCardActivate(location, index) {
      handleCard(location, index)
    },
    onCardDblClick(location, index) {
      ui.clearSelection()
      const pile = cardsAt(location)
      if (location.type === 'foundation') return
      if (index !== pile.length - 1) {
        ui.flashInvalid(pile[index]?.card.id ?? null)
        void announce('Only the top card can go to a foundation.')
        return
      }
      game.autoMove(location)
    },
    onCardPointerDown(event, location, index) {
      dnd.onPointerDown(event, location, index)
    },
    onPileActivate(location) {
      game.clearHint()
      if (ui.selection) dropSelectionOn(location)
    },
    onStockClick() {
      ui.clearSelection()
      game.clearHint()
      game.drawFromStock()
    },
    canPickUp: (location, index) => game.canPickUp(location, index),
    isSelected: (location, index) => ui.isSelected(location, index),
    isCardDragging: (cardId) => dnd.isCardDragging(cardId),
    isInvalid: (cardId) => ui.invalidCardId === cardId,
    isHintSource(location, index) {
      const move = game.activeHint?.move
      return !!move && sameLocation(move.from, location) && index >= move.cardIndex
    },
    isHintTarget(location) {
      const move = game.activeHint?.move
      return !!move && sameLocation(move.to, location)
    },
    isSelectionTarget: (location) => rules.isValidTarget(location),
    dropState(location): DropState {
      const target = dnd.drag.value?.target
      if (!target || dnd.dragTargetKey.value !== locationKey(location)) return null
      return target.valid ? 'valid' : 'invalid'
    },
    get celebrating() {
      return celebrating.value
    },
  }

  const celebrating = computed(() => game.hasWon)
  return context
}
