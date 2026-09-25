/**
 * A reversible operation over an immutable state `S`.
 *
 * `execute` computes (and remembers) the next state; `undo` returns the state
 * from before the command ran. Commands are replayable: executing again
 * after an undo yields the same result (redo).
 */
export interface Command<S> {
  /** Short human-readable description, e.g. for announcements. */
  readonly label: string
  execute(state: S): S
  undo(): S
}
