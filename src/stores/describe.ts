import type { Card } from '@/domain/models/Card'
import { FOUNDATION_SUITS } from '@/domain/models/GameState'
import type { PileLocation } from '@/domain/types/PileType'
import { SUIT_NAMES, type Suit } from '@/domain/types/Suit'
import type { EngineResult } from '@/domain/services/GameEngine'
import { plural } from '@/utils/format'

/** Human-readable pile name, e.g. "column 3" or "the Hearts foundation". */
export function pileName(location: PileLocation): string {
  switch (location.type) {
    case 'stock':
      return 'the stock'
    case 'waste':
      return 'the waste'
    case 'foundation':
      return `the ${SUIT_NAMES[FOUNDATION_SUITS[location.index] as Suit]} foundation`
    case 'tableau':
      return `column ${location.index + 1}`
  }
}

function cardsPhrase(cards: readonly Card[]): string {
  const rest = cards.length - 1
  return `${cards[0]!.name}${rest > 0 ? ` and ${plural(rest, 'more card')}` : ''}`
}

/** Describes a successful engine action for announcements and undo labels. */
export function describeResult(result: Extract<EngineResult, { ok: true }>): string {
  const { state, cards } = result
  switch (result.kind) {
    case 'draw': {
      const top = state.waste[state.waste.length - 1]!.card
      return `Drew ${plural(cards.length, 'card')}. ${top.name} is on top of the waste.`
    }
    case 'recycle':
      return `Turned the waste over. ${plural(state.stock.length, 'card')} back in the stock.`
    case 'move': {
      const revealed = result.revealed ? ` Revealed ${result.revealed.name}.` : ''
      return `Moved card: ${cardsPhrase(cards)} to ${pileName(result.move!.to)}.${revealed}`
    }
  }
}
