import { describe, expect, it } from 'vitest'
import { CommandHistory } from '@/domain/commands/CommandHistory'
import { MoveCommand } from '@/domain/commands/MoveCommand'
import type { Command } from '@/domain/commands/Command'
import { draw } from '@/domain/services/GameEngine'
import { layout } from '@/testing/fixtures'

class Add implements Command<number> {
  private before = 0
  readonly label: string
  constructor(private readonly amount: number) {
    this.label = `add ${amount}`
  }
  execute(state: number) {
    this.before = state
    return state + this.amount
  }
  undo() {
    return this.before
  }
}

describe('CommandHistory', () => {
  it('executes, undoes and redoes', () => {
    const history = new CommandHistory<number>()
    expect(history.canUndo).toBe(false)
    expect(history.canRedo).toBe(false)
    let state = history.execute(new Add(2), 1)
    state = history.execute(new Add(3), state)
    expect(state).toBe(6)
    expect(history.undoCount).toBe(2)

    const undone = history.undo()!
    expect(undone.state).toBe(3)
    expect(undone.command.label).toBe('add 3')
    expect(history.canRedo).toBe(true)
    expect(history.redoCount).toBe(1)

    const redone = history.redo(undone.state)!
    expect(redone.state).toBe(6)
    expect(history.redoCount).toBe(0)
  })

  it('clears redo on new commands and supports unlimited depth', () => {
    const history = new CommandHistory<number>()
    let state = 0
    for (let i = 0; i < 1000; i++) state = history.execute(new Add(1), state)
    expect(history.undoCount).toBe(1000)
    state = history.undo()!.state
    expect(history.canRedo).toBe(true)
    state = history.execute(new Add(10), state)
    expect(history.canRedo).toBe(false)
    expect(state).toBe(1009)
  })

  it('returns null when there is nothing to undo or redo', () => {
    const history = new CommandHistory<number>()
    expect(history.undo()).toBeNull()
    expect(history.redo(0)).toBeNull()
  })

  it('can be cleared', () => {
    const history = new CommandHistory<number>()
    history.execute(new Add(1), 0)
    history.undo()
    history.execute(new Add(1), 0)
    history.clear()
    expect(history.canUndo).toBe(false)
    expect(history.canRedo).toBe(false)
  })
})

describe('MoveCommand', () => {
  it('restores the exact previous snapshot', () => {
    const before = layout({ stock: 'AH 2H' })
    const result = draw(before)
    if (!result.ok) throw new Error()
    const command = new MoveCommand(result.state, 'Drew cards')
    expect(command.label).toBe('Drew cards')
    expect(command.execute(before)).toBe(result.state)
    expect(command.undo()).toBe(before)
  })

  it('refuses to undo before executing', () => {
    expect(() => new MoveCommand(layout({}), 'x').undo()).toThrow(/not been executed/)
  })
})
