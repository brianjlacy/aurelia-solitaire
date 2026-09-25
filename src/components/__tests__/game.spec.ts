import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { nextTick } from 'vue'
import App from '@/App.vue'
import GameControls from '@/components/game/GameControls.vue'
import DragLayer from '@/components/game/DragLayer.vue'
import MoveCounter from '@/components/game/MoveCounter.vue'
import TimerDisplay from '@/components/game/TimerDisplay.vue'
import IconButton from '@/components/ui/IconButton.vue'
import { useGameStore } from '@/stores/gameStore'
import { useUiStore } from '@/stores/uiStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { resetDragForTests, type DragState } from '@/composables/useDragDrop'
import { Locations } from '@/domain/types'
import { autoCompleteState, layout, nearWinState } from '@/testing/fixtures'

describe('presentational game components', () => {
  it('MoveCounter shows the count', () => {
    expect(
      mount(MoveCounter, { props: { count: 7 } })
        .get('.move-counter')
        .text(),
    ).toBe('7')
  })

  it('TimerDisplay shows elapsed time with an accessible label', () => {
    const wrapper = mount(TimerDisplay, {
      props: { elapsed: '01:05', spoken: '1 minute 5 seconds' },
    })
    expect(wrapper.get('.timer-display').text()).toBe('01:05')
    expect(wrapper.attributes('aria-label')).toBe('Time 1 minute 5 seconds')
  })

  it('GameControls emits actions and reflects availability', async () => {
    const wrapper = mount(GameControls, {
      props: {
        canUndo: false,
        canRedo: true,
        canHint: true,
        canAutoComplete: true,
        hintsRemaining: 2,
      },
    })
    expect(wrapper.get('button[aria-label="Undo"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('button[aria-label="Redo"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.get('button[aria-label="Hint"]').text()).toContain('Hint (2)')
    const clicks: [string, string][] = [
      ['button:first-child', 'new-game'],
      ['button[aria-label="Redo"]', 'redo'],
      ['button[aria-label="Hint"]', 'hint'],
      ['button[aria-label="Auto-complete"]', 'auto-complete'],
      ['button[aria-label="Statistics"]', 'stats'],
      ['button[aria-label="Settings"]', 'settings'],
      ['button[aria-label="Help"]', 'help'],
    ]
    for (const [selector, event] of clicks) {
      await wrapper.get(selector).trigger('click')
      expect(wrapper.emitted(event), event).toHaveLength(1)
    }
    await wrapper.setProps({ canUndo: true, canAutoComplete: false, hintsRemaining: null })
    await wrapper.get('button[aria-label="Undo"]').trigger('click')
    expect(wrapper.emitted('undo')).toHaveLength(1)
    expect(wrapper.find('button[aria-label="Auto-complete"]').exists()).toBe(false)
    expect(wrapper.get('button[aria-label="Hint"]').text()).toBe('Hint')
  })

  it('IconButton exposes the shortcut in its title', () => {
    const wrapper = mount(IconButton, {
      props: { icon: 'undo', label: 'Undo', shortcut: 'Control+Z', variant: 'surface' },
    })
    expect(wrapper.attributes('title')).toBe('Undo (Control+Z)')
    expect(wrapper.attributes('aria-keyshortcuts')).toBe('Control+Z')
    expect(wrapper.classes()).toContain('btn-surface')
    const plain = mount(IconButton, {
      props: { icon: 'undo', label: 'Undo', variant: 'primary', alwaysShowText: true },
    })
    expect(plain.attributes('title')).toBe('Undo')
    expect(plain.classes()).toContain('btn-primary')
  })
})

describe('DragLayer', () => {
  const base: DragState = {
    location: Locations.tableau(0),
    index: 1,
    cardIds: ['hearts-13'],
    x: 100,
    y: 50,
    offsetX: 10,
    offsetY: 5,
    width: 80,
    height: 112,
    originX: 0,
    originY: 0,
    target: null,
    phase: 'dragging',
  }

  it('renders the dragged run at the pointer and marks the body', async () => {
    const state = layout({ tableau: ['#2C KH QS'] })
    const wrapper = mount(DragLayer, { props: { drag: base, state } })
    expect(wrapper.findAll('.card')).toHaveLength(2)
    expect(wrapper.attributes('style')).toContain('translate(90px, 45px)')
    expect(document.body.classList.contains('is-dragging')).toBe(true)
    await wrapper.setProps({
      drag: { ...base, target: { location: Locations.tableau(1), valid: false } },
    })
    expect(wrapper.classes()).toContain('drag-layer--invalid')
    expect(document.body.classList.contains('is-over-invalid')).toBe(true)
    await wrapper.setProps({
      drag: {
        ...base,
        target: { location: Locations.tableau(1), valid: true },
        phase: 'returning',
      },
    })
    expect(wrapper.classes()).toContain('drag-layer--valid')
    expect(wrapper.classes()).toContain('drag-layer--returning')
    await wrapper.setProps({ drag: null })
    expect(wrapper.find('.drag-layer').exists()).toBe(false)
    expect(document.body.classList.contains('is-dragging')).toBe(false)
  })

  it('handles waste and foundation sources and missing cards', async () => {
    const state = layout({ waste: 'QH', foundationRanks: [1, 0, 0, 0] })
    const wrapper = mount(DragLayer, {
      props: { drag: { ...base, cardIds: ['hearts-12'] }, state },
    })
    expect(wrapper.findAll('.card')).toHaveLength(1)
    await wrapper.setProps({ drag: { ...base, cardIds: ['hearts-1'] } })
    expect(wrapper.findAll('.card')).toHaveLength(1)
    await wrapper.setProps({ drag: { ...base, cardIds: ['clubs-9'] } })
    expect(wrapper.find('.drag-layer').exists()).toBe(false)
    await wrapper.setProps({ drag: { ...base, cardIds: [] } })
    expect(wrapper.find('.drag-layer').exists()).toBe(false)
  })
})

describe('App integration', () => {
  let pinia: Pinia

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    resetDragForTests()
    window.history.replaceState(null, '', '/?seed=42')
  })
  afterEach(() => {
    document.body.innerHTML = ''
    window.history.replaceState(null, '', '/')
  })

  async function mountApp() {
    const wrapper = mount(App, { global: { plugins: [pinia] }, attachTo: document.body })
    await flushPromises()
    return { wrapper, game: useGameStore(), ui: useUiStore() }
  }

  it('deals the seeded game and renders the table', async () => {
    const { wrapper, game } = await mountApp()
    expect(game.state.seed).toBe(42)
    expect(wrapper.findAll('.tableau-pile')).toHaveLength(7)
    expect(wrapper.findAll('.foundation-pile')).toHaveLength(4)
    expect(wrapper.findAll('.tableau-pile .card')).toHaveLength(28)
    expect(wrapper.get('.move-counter').text()).toBe('0')
    expect(wrapper.find('[role="status"][aria-live="polite"]').exists()).toBe(true)
    expect(wrapper.get('.skip-link').attributes('href')).toBe('#main')
    wrapper.unmount()
  })

  it('draws, undoes and redoes through the header', async () => {
    const { wrapper, game } = await mountApp()
    await wrapper.get('.stock-button').trigger('click')
    expect(game.moveCount).toBe(1)
    expect(wrapper.get('.move-counter').text()).toBe('1')
    await wrapper.get('button[aria-label="Undo"]').trigger('click')
    expect(game.moveCount).toBe(0)
    await wrapper.get('button[aria-label="Redo"]').trigger('click')
    expect(game.moveCount).toBe(1)
    wrapper.unmount()
  })

  it('confirms before abandoning a started game', async () => {
    const { wrapper, game, ui } = await mountApp()
    await wrapper.get('.game-board header nav button').trigger('click')
    expect(ui.modal).toBeNull()
    game.drawFromStock()
    await nextTick()
    await wrapper.get('.game-board header nav button').trigger('click')
    expect(ui.modal).toBe('confirm-new')
    await flushPromises()
    const restart = [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Restart deal'),
    )!
    restart.click()
    await flushPromises()
    expect(ui.modal).toBeNull()
    expect(game.moveCount).toBe(0)
    game.drawFromStock()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'n' }))
    await flushPromises()
    expect(ui.modal).toBe('confirm-new')
    const confirm = [...document.querySelectorAll('.confirm-modal button')].find(
      (b) => b.textContent?.trim() === 'New Game',
    )!
    ;(confirm as HTMLButtonElement).click()
    await flushPromises()
    expect(game.moveCount).toBe(0)
    wrapper.unmount()
  })

  it('handles keyboard shortcuts', async () => {
    const { wrapper, game, ui } = await mountApp()
    game.drawFromStock()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }))
    expect(game.moveCount).toBe(0)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'y', ctrlKey: true }))
    expect(game.moveCount).toBe(1)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'h' }))
    expect(game.activeHint).not.toBeNull()
    ui.select(Locations.tableau(0), 0)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(ui.selection).toBeNull()
    expect(game.activeHint).toBeNull()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }))
    expect(ui.modal).toBe('help')
    // Shortcuts are disabled while a dialog is open.
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }))
    expect(game.moveCount).toBe(1)
    wrapper.unmount()
  })

  it('opens each dialog from the header', async () => {
    const { wrapper, ui } = await mountApp()
    for (const [label, modal, selector] of [
      ['Statistics', 'stats', '.stats-modal'],
      ['Settings', 'settings', '.settings-modal'],
      ['Help', 'help', '.help-modal'],
    ] as const) {
      await wrapper.get(`button[aria-label="${label}"]`).trigger('click')
      expect(ui.modal).toBe(modal)
      await flushPromises()
      await vi.waitFor(() => expect(document.querySelector(selector)).not.toBeNull())
      ui.closeModal()
      await flushPromises()
    }
    wrapper.unmount()
  })

  it('shows the win dialog and auto-completes', async () => {
    vi.useFakeTimers()
    const { wrapper, game, ui } = await mountApp()
    game.loadState(autoCompleteState())
    await nextTick()
    await wrapper.get('button[aria-label="Auto-complete"]').trigger('click')
    await vi.runAllTimersAsync()
    expect(game.hasWon).toBe(true)
    expect(ui.modal).toBe('win')
    vi.useRealTimers()
    await flushPromises()
    await vi.waitFor(() => expect(document.querySelector('.win-modal')).not.toBeNull())
    expect(document.querySelector('.win-modal')!.textContent).toContain('You Won!')
    wrapper.unmount()
  })

  it('applies settings reactively (timer visibility)', async () => {
    const { wrapper } = await mountApp()
    expect(wrapper.find('.timer-display').exists()).toBe(true)
    useSettingsStore().update({ showTimer: false })
    await nextTick()
    expect(wrapper.find('.timer-display').exists()).toBe(false)
    wrapper.unmount()
  })

  it('restores a saved game instead of dealing when no seed is given', async () => {
    window.history.replaceState(null, '', '/')
    const first = await mountApp()
    first.game.loadState(nearWinState())
    first.game.drawFromStock()
    first.game.pause()
    first.wrapper.unmount()
    pinia = createPinia()
    setActivePinia(pinia)
    const second = await mountApp()
    expect(second.game.state.foundations[0]).toHaveLength(13)
    second.wrapper.unmount()
  })
})
