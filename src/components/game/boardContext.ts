import { inject, type InjectionKey } from 'vue'
import type { PileLocation } from '@/domain/types/PileType'

export type DropState = 'valid' | 'invalid' | null

/** Interaction API the board provides to its piles. */
export interface BoardContext {
  onCardClick(location: PileLocation, index: number): void
  onCardDblClick(location: PileLocation, index: number): void
  onCardActivate(location: PileLocation, index: number): void
  onCardPointerDown(event: PointerEvent, location: PileLocation, index: number): void
  onPileActivate(location: PileLocation): void
  onStockClick(): void
  canPickUp(location: PileLocation, index: number): boolean
  isSelected(location: PileLocation, index: number): boolean
  isCardDragging(cardId: string): boolean
  isInvalid(cardId: string): boolean
  isHintSource(location: PileLocation, index: number): boolean
  isHintTarget(location: PileLocation): boolean
  isSelectionTarget(location: PileLocation): boolean
  dropState(location: PileLocation): DropState
  readonly celebrating: boolean
}

export const BOARD_CONTEXT: InjectionKey<BoardContext> = Symbol('BoardContext')

/** Injects the board context; throws when used outside a board. */
export function useBoardContext(): BoardContext {
  const context = inject(BOARD_CONTEXT)
  if (!context) throw new Error('Pile components must be rendered inside <GameBoard>')
  return context
}

/** Builds the CSS classes for a pile's drop/hint state. */
export function pileStateClasses(board: BoardContext, location: PileLocation) {
  const drop = board.dropState(location)
  return {
    'pile--drop-valid': drop === 'valid',
    'pile--drop-invalid': drop === 'invalid',
    'pile--target':
      drop === null && (board.isHintTarget(location) || board.isSelectionTarget(location)),
  }
}
