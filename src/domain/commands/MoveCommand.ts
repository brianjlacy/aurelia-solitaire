import type { GameState } from '../models/GameState'
import type { Command } from './Command'

/**
 * Captures a single state transition produced by the game engine.
 *
 * Because {@link GameState} is immutable, storing the before/after
 * snapshots is enough to undo and redo the move exactly.
 */
export class MoveCommand implements Command<GameState> {
  private before: GameState | null = null

  constructor(
    private readonly after: GameState,
    readonly label: string,
  ) {}

  execute(state: GameState): GameState {
    this.before = state
    return this.after
  }

  undo(): GameState {
    if (!this.before) throw new Error('Cannot undo a command that has not been executed')
    return this.before
  }
}
