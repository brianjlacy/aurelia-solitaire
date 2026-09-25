import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { useAnnouncer } from '@/composables/useAnnouncer'
import { useStatistics } from '@/composables/useStatistics'
import { useTheme } from '@/composables/useTheme'
import { useTimer } from '@/composables/useTimer'
import { useGameRules } from '@/composables/useGameRules'
import { matchShortcut, useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
import { useSettingsStore } from '@/stores/settingsStore'
import { useStatsStore } from '@/stores/statsStore'
import { useGameStore } from '@/stores/gameStore'
import { useUiStore } from '@/stores/uiStore'
import { Locations } from '@/domain/types'
import { layout } from '@/testing/fixtures'
import { withSetup } from '@/testing/mount'

describe('useAnnouncer', () => {
  it('announces, re-announcing identical messages', async () => {
    const { announcement, announce } = useAnnouncer()
    await announce('Hello')
    expect(announcement.value).toBe('Hello')
    const pending = announce('Hello')
    expect(announcement.value).toBe('')
    await pending
    expect(announcement.value).toBe('Hello')
  })

  it('keeps only the latest of rapid announcements', async () => {
    const { announcement, announce } = useAnnouncer()
    const first = announce('first')
    const second = announce('second')
    await Promise.all([first, second])
    expect(announcement.value).toBe('second')
  })
})

describe('useStatistics', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('formats rows', () => {
    const { rows } = useStatistics()
    expect(rows.value.find((r) => r.key === 'best-time')?.value).toBe('—')
    expect(rows.value.find((r) => r.key === 'fewest')?.value).toBe('—')
    const stats = useStatsStore()
    stats.recordGameStarted()
    stats.recordWin({ timeMs: 61_000, moves: 88 })
    expect(rows.value.find((r) => r.key === 'best-time')?.value).toBe('01:01')
    expect(rows.value.find((r) => r.key === 'fewest')?.value).toBe('88')
    expect(rows.value.find((r) => r.key === 'rate')?.value).toBe('100%')
  })
})

describe('useTheme', () => {
  it('applies theme and card back attributes', async () => {
    const { result, wrapper } = withSetup(() => useTheme())
    const root = document.documentElement
    expect(result.resolvedTheme.value).toBe('classic')
    expect(root.dataset.theme).toBe('classic')
    expect(root.style.colorScheme).toBe('light')
    const settings = useSettingsStore()
    settings.update({ theme: 'high-contrast', cardBack: 'purple' })
    await nextTick()
    expect(root.dataset.theme).toBe('high-contrast')
    expect(root.dataset.cardBack).toBe('purple')
    expect(root.style.colorScheme).toBe('dark')
    wrapper.unmount()
  })
})

describe('useTimer', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('ticks while running and pauses when hidden', async () => {
    const { result, wrapper } = withSetup(() => useTimer(1000))
    const game = useGameStore()
    game.loadState(layout({ stock: 'AH 2H' }))
    game.drawFromStock()
    await nextTick()
    vi.advanceTimersByTime(3000)
    expect(result.elapsed.value).toBe('00:03')
    expect(result.elapsedSpoken.value).toBe('3 seconds')

    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(game.isTimerRunning).toBe(false)
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(game.isTimerRunning).toBe(true)

    window.dispatchEvent(new Event('pagehide'))
    expect(game.isTimerRunning).toBe(false)
    wrapper.unmount()
  })
})

describe('useGameRules', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('lists valid targets for the selection', () => {
    const game = useGameStore()
    game.loadState(layout({ tableau: ['KS', 'QH', ''], foundationRanks: [0, 0, 0, 0] }))
    const rules = useGameRules()
    expect(rules.validTargets.value.size).toBe(0)
    useUiStore().select(Locations.tableau(1), 0)
    expect([...rules.validTargets.value]).toEqual(['tableau-0'])
    expect(rules.isValidTarget(Locations.tableau(0))).toBe(true)
    expect(rules.isValidTarget(Locations.tableau(2))).toBe(false)
    expect(rules.canPickUp(Locations.tableau(1), 0)).toBe(true)
  })
})

describe('keyboard shortcuts', () => {
  const key = (init: KeyboardEventInit) => new KeyboardEvent('keydown', init)

  it('maps keys to shortcuts', () => {
    expect(matchShortcut(key({ key: 'z', ctrlKey: true }))).toBe('undo')
    expect(matchShortcut(key({ key: 'Z', metaKey: true, shiftKey: true }))).toBe('redo')
    expect(matchShortcut(key({ key: 'y', ctrlKey: true }))).toBe('redo')
    expect(matchShortcut(key({ key: 'c', ctrlKey: true }))).toBeNull()
    expect(matchShortcut(key({ key: 'z', ctrlKey: true, altKey: true }))).toBeNull()
    expect(matchShortcut(key({ key: 'n', altKey: true }))).toBeNull()
    expect(matchShortcut(key({ key: '?', shiftKey: true }))).toBe('help')
    expect(matchShortcut(key({ key: 'Escape' }))).toBe('escape')
    expect(matchShortcut(key({ key: 'N', shiftKey: true }))).toBeNull()
    expect(matchShortcut(key({ key: 'n' }))).toBe('newGame')
    expect(matchShortcut(key({ key: 'h' }))).toBe('hint')
    expect(matchShortcut(key({ key: 'x' }))).toBeNull()
  })

  it('dispatches handlers and respects guards', () => {
    const handlers = {
      undo: vi.fn(),
      redo: vi.fn(),
      newGame: vi.fn(),
      hint: vi.fn(),
      help: vi.fn(),
      escape: vi.fn(),
      disabled: vi.fn(() => false),
    }
    const { wrapper } = withSetup(() => useKeyboardShortcuts(handlers))
    window.dispatchEvent(key({ key: 'h' }))
    expect(handlers.hint).toHaveBeenCalledTimes(1)
    window.dispatchEvent(key({ key: 'h', repeat: true }))
    window.dispatchEvent(key({ key: 'x' }))
    expect(handlers.hint).toHaveBeenCalledTimes(1)

    const input = document.createElement('input')
    document.body.append(input)
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'h', bubbles: true }))
    expect(handlers.hint).toHaveBeenCalledTimes(1)
    input.remove()

    handlers.disabled.mockReturnValue(true)
    window.dispatchEvent(key({ key: 'n' }))
    expect(handlers.newGame).not.toHaveBeenCalled()
    handlers.disabled.mockReturnValue(false)

    const prevented = key({ key: 'n', cancelable: true })
    prevented.preventDefault()
    window.dispatchEvent(prevented)
    expect(handlers.newGame).not.toHaveBeenCalled()

    window.dispatchEvent(key({ key: 'z', ctrlKey: true }))
    expect(handlers.undo).toHaveBeenCalled()
    wrapper.unmount()
    window.dispatchEvent(key({ key: 'z', ctrlKey: true }))
    expect(handlers.undo).toHaveBeenCalledTimes(1)
  })
})
