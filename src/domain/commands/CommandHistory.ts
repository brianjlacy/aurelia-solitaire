import type { Command } from './Command'

/** Unlimited undo/redo stacks of executed commands. */
export class CommandHistory<S> {
  private readonly done: Command<S>[] = []
  private readonly undone: Command<S>[] = []

  /** Executes a command and records it. Clears the redo stack. */
  execute(command: Command<S>, state: S): S {
    const next = command.execute(state)
    this.done.push(command)
    this.undone.length = 0
    return next
  }

  /** Reverts the most recent command, or returns `null` if there is none. */
  undo(): { state: S; command: Command<S> } | null {
    const command = this.done.pop()
    if (!command) return null
    this.undone.push(command)
    return { state: command.undo(), command }
  }

  /** Re-applies the most recently undone command, or returns `null`. */
  redo(state: S): { state: S; command: Command<S> } | null {
    const command = this.undone.pop()
    if (!command) return null
    this.done.push(command)
    return { state: command.execute(state), command }
  }

  get canUndo(): boolean {
    return this.done.length > 0
  }

  get canRedo(): boolean {
    return this.undone.length > 0
  }

  get undoCount(): number {
    return this.done.length
  }

  get redoCount(): number {
    return this.undone.length
  }

  /** Forgets all history (e.g. on a new game). */
  clear(): void {
    this.done.length = 0
    this.undone.length = 0
  }
}
