import type { GameState } from '../models/GameState'
import { firstFaceUpIndex, topOf, type PileCards } from '../models/Pile'
import type { Move } from '../types/Move'
import { Rank } from '../types/Rank'
import { findFoundationMove, listLegalMoves } from './GameEngine'
import { pileAt } from './MoveValidator'

/** Category of a hint, from most to least useful. */
export type HintKind =
  'foundation' | 'reveal' | 'waste' | 'empty-column' | 'build' | 'draw' | 'recycle'

/** A suggested next action. `move` is absent for stock draws. */
export interface Hint {
  readonly kind: HintKind
  readonly priority: number
  readonly description: string
  readonly move?: Move
}

const PRIORITY: Readonly<Record<HintKind, number>> = {
  foundation: 100,
  reveal: 80,
  waste: 60,
  'empty-column': 50,
  build: 40,
  draw: 20,
  recycle: 10,
}

function describe(state: GameState, move: Move): string {
  const source = pileAt(state, move.from) as PileCards
  const card = source[move.cardIndex]!.card
  if (move.to.type === 'foundation') return `Move ${card.name} to the foundation.`
  const target = pileAt(state, move.to) as PileCards
  const top = topOf(target)
  return top ? `Move ${card.name} onto ${top.card.name}.` : `Move ${card.name} to the empty column.`
}

function classify(state: GameState, move: Move): HintKind | null {
  const source = pileAt(state, move.from) as PileCards
  const moving = source[move.cardIndex]!
  // Foundation-to-foundation moves are impossible (each foundation holds one suit).
  if (move.to.type === 'foundation') return 'foundation'
  // Taking cards back off a foundation is never suggested.
  if (move.from.type === 'foundation') return null
  if (move.from.type === 'waste') return 'waste'

  const baseOfRun = move.cardIndex === firstFaceUpIndex(source)
  const revealsCard = baseOfRun && move.cardIndex > 0
  const target = pileAt(state, move.to) as PileCards
  if (target.length === 0) {
    // Moving a King that already heads its column onto another empty column is pointless.
    return revealsCard && moving.card.rank === Rank.King ? 'empty-column' : null
  }
  if (revealsCard) return 'reveal'
  // Splitting a run is only useful when it frees the card underneath for a foundation.
  if (!baseOfRun) {
    const remaining = source.slice(0, move.cardIndex)
    const probe: GameState = {
      ...state,
      tableau: state.tableau.map((p, i) => (i === move.from.index ? remaining : p)),
    }
    return findFoundationMove(probe, move.from) ? 'build' : null
  }
  return null
}

/** All useful hints, best first. */
export function findHints(state: GameState): Hint[] {
  if (state.status === 'won') return []
  const hints: Hint[] = []
  for (const move of listLegalMoves(state)) {
    const kind = classify(state, move)
    if (kind)
      hints.push({ kind, priority: PRIORITY[kind], description: describe(state, move), move })
  }
  if (state.stock.length > 0) {
    hints.push({ kind: 'draw', priority: PRIORITY.draw, description: 'Draw from the stock.' })
  } else if (state.waste.length > 0) {
    hints.push({
      kind: 'recycle',
      priority: PRIORITY.recycle,
      description: 'Turn the waste pile over to start the stock again.',
    })
  }
  return hints.sort((a, b) => b.priority - a.priority)
}

/** The single best hint, or `null` when no productive move exists. */
export function getBestHint(state: GameState): Hint | null {
  return findHints(state)[0] ?? null
}
