import type { Pinia } from 'pinia'
import { useGameStore } from '@/stores/gameStore'
import { deserializeGameState, serializeGameState } from '@/domain/services/Serializer'
import type { GameState } from '@/domain/models/GameState'
import { aceReadyState, autoCompleteState, layout, nearWinState, type LayoutSpec } from './fixtures'

const FIXTURES: Record<string, () => GameState> = {
  nearWin: nearWinState,
  autoComplete: autoCompleteState,
  aceReady: aceReadyState,
}

export interface SolitaireTestHooks {
  load(name: keyof typeof FIXTURES): void
  loadLayout(spec: LayoutSpec): void
  loadSerialized(data: unknown): boolean
  getState(): ReturnType<typeof serializeGameState>
}

declare global {
  interface Window {
    __solitaire?: SolitaireTestHooks
  }
}

/** Exposes fixtures and state inspection on `window.__solitaire` for Playwright. */
export function installE2EHooks(pinia: Pinia): void {
  const game = useGameStore(pinia)
  window.__solitaire = {
    load: (name) => game.loadState(FIXTURES[name]!()),
    loadLayout: (spec) => game.loadState(layout(spec)),
    loadSerialized(data) {
      const state = deserializeGameState(data)
      if (state) game.loadState(state)
      return state !== null
    },
    getState: () => serializeGameState(game.state),
  }
  document.documentElement.dataset.testHooks = 'ready'
}
