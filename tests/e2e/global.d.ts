/** Mirror of `SolitaireTestHooks` in src/testing/e2eHooks.ts (kept separate to avoid app path aliases). */
interface SolitaireTestHooks {
  load(name: 'nearWin' | 'autoComplete' | 'aceReady'): void
  loadLayout(spec: unknown): void
  loadSerialized(data: unknown): boolean
  getState(): {
    stock: string[]
    waste: string[]
    foundations: string[][]
    tableau: string[][]
    drawCount: 1 | 3
    moveCount: number
    status: 'idle' | 'playing' | 'won'
    seed: number | null
    recycleCount: number
  }
}

interface Window {
  __solitaire?: SolitaireTestHooks
}
