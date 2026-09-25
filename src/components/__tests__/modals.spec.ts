import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import type { Component } from 'vue'
import SettingsModal from '@/components/modals/SettingsModal.vue'
import StatsModal from '@/components/modals/StatsModal.vue'
import WinModal from '@/components/modals/WinModal.vue'
import HelpModal from '@/components/modals/HelpModal.vue'
import GameModals from '@/components/modals/GameModals.vue'
import ConfirmNewGameModal from '@/components/modals/ConfirmNewGameModal.vue'
import { useSettingsStore, DEFAULT_SETTINGS } from '@/stores/settingsStore'
import { useStatsStore } from '@/stores/statsStore'
import { useGameStore } from '@/stores/gameStore'
import { Locations } from '@/domain/types'
import { nearWinState } from '@/testing/fixtures'

let pinia: Pinia

beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
})
afterEach(() => {
  document.body.innerHTML = ''
})

async function open(component: Component, props: Record<string, unknown> = {}) {
  const wrapper = mount(component, {
    props: { open: true, ...props },
    global: { plugins: [pinia] },
    attachTo: document.body,
  })
  await flushPromises()
  return wrapper
}

const $ = <T extends Element = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)!
const button = (text: string) =>
  [...document.querySelectorAll<HTMLButtonElement>('button')].find(
    (b) => b.textContent?.trim() === text,
  )!

function change(el: HTMLInputElement | HTMLSelectElement, value?: string | boolean) {
  if (typeof value === 'boolean') (el as HTMLInputElement).checked = value
  else if (value !== undefined) el.value = value
  el.dispatchEvent(
    new Event(el instanceof HTMLSelectElement || el.type !== 'range' ? 'change' : 'input'),
  )
}

describe('SettingsModal', () => {
  it('updates every setting', async () => {
    const wrapper = await open(SettingsModal, { currentDrawCount: 3 })
    const settings = useSettingsStore()
    change($<HTMLInputElement>('input[name="draw-count"][value="1"]'), true)
    expect(settings.drawCount).toBe(1)
    await flushPromises()
    expect(document.body.textContent).toContain('Takes effect when you start a new game.')

    const [theme, back, hints] = [...document.querySelectorAll<HTMLSelectElement>('select')]
    change(theme!, 'dark')
    change(back!, 'green')
    change(hints!, '5')
    expect(settings.theme).toBe('dark')
    expect(settings.cardBack).toBe('green')
    expect(settings.hintLimit).toBe(5)

    const [timer, sound] = [
      ...document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'),
    ]
    change(timer!, false)
    expect(settings.showTimer).toBe(false)
    const range = $<HTMLInputElement>('input[type="range"]')
    range.value = '30'
    range.dispatchEvent(new Event('input'))
    expect(settings.volume).toBeCloseTo(0.3)
    change(sound!, false)
    expect(settings.soundEnabled).toBe(false)

    button('Restore defaults').click()
    expect(settings.settings).toEqual(DEFAULT_SETTINGS)
    $<HTMLFormElement>('form').dispatchEvent(new Event('submit'))
    expect(wrapper.emitted('close')).toHaveLength(1)
    wrapper.unmount()
  })

  it('closes with the close button', async () => {
    const wrapper = await open(SettingsModal, { currentDrawCount: 3 })
    $<HTMLButtonElement>('button[aria-label="Close"]').click()
    expect(wrapper.emitted('close')).toHaveLength(1)
    wrapper.unmount()
  })
})

describe('StatsModal', () => {
  it('shows statistics and resets after confirmation', async () => {
    const stats = useStatsStore()
    stats.recordGameStarted()
    const wrapper = await open(StatsModal)
    expect($('[data-stat="played"]').textContent).toContain('1')
    button('Reset statistics').click()
    await flushPromises()
    button('Cancel').click()
    await flushPromises()
    expect(stats.stats.gamesPlayed).toBe(1)
    button('Reset statistics').click()
    await flushPromises()
    button('Reset').click()
    await flushPromises()
    expect(stats.stats.gamesPlayed).toBe(0)
    button('Done').click()
    expect(wrapper.emitted('close')).toHaveLength(1)
    wrapper.unmount()
  })
})

describe('WinModal', () => {
  it('shows the result, records and actions', async () => {
    const game = useGameStore()
    game.loadState(nearWinState())
    game.move({ from: Locations.tableau(0), cardIndex: 0, to: Locations.foundation(3) })
    const wrapper = await open(WinModal)
    expect($('.win-modal').textContent).toContain('You Won!')
    expect($('.win-modal').textContent).toContain('100')
    expect($('.win-modal').textContent).toContain('Best!')
    button('View statistics').click()
    button('New Game').click()
    expect(wrapper.emitted('stats')).toHaveLength(1)
    expect(wrapper.emitted('new-game')).toHaveLength(1)
    wrapper.unmount()
  })

  it('omits record badges when not a record', async () => {
    const stats = useStatsStore()
    stats.recordGameStarted()
    stats.recordWin({ timeMs: 1, moves: 1 })
    useGameStore().newGame()
    const wrapper = await open(WinModal)
    expect($('.win-modal').textContent).not.toContain('Best!')
    wrapper.unmount()
  })
})

describe('HelpModal and ConfirmNewGameModal', () => {
  it('help lists shortcuts and closes', async () => {
    const wrapper = await open(HelpModal)
    expect($('.help-modal').textContent).toContain('Ctrl+Z / Ctrl+Y')
    button('Got it').click()
    expect(wrapper.emitted('close')).toHaveLength(1)
    wrapper.unmount()
  })

  it('confirm dialog emits each choice', async () => {
    const wrapper = await open(ConfirmNewGameModal)
    button('Keep playing').click()
    button('Restart deal').click()
    button('New Game').click()
    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(wrapper.emitted('restart')).toHaveLength(1)
    expect(wrapper.emitted('confirm')).toHaveLength(1)
    wrapper.unmount()
  })
})

describe('GameModals', () => {
  it('renders the requested dialog and relays events', async () => {
    const wrapper = mount(GameModals, {
      props: { modal: 'win', drawCount: 3 },
      global: { plugins: [pinia] },
      attachTo: document.body,
    })
    await vi.waitFor(() => expect(document.querySelector('.win-modal')).not.toBeNull())
    button('View statistics').click()
    expect(wrapper.emitted('open')![0]).toEqual(['stats'])
    button('New Game').click()
    expect(wrapper.emitted('confirm-new-game')).toHaveLength(1)
    $<HTMLButtonElement>('button[aria-label="Close"]').click()
    expect(wrapper.emitted('close')).toHaveLength(1)

    for (const [modal, selector, closeText] of [
      ['settings', '.settings-modal', 'Done'],
      ['stats', '.stats-modal', 'Done'],
      ['help', '.help-modal', 'Got it'],
    ] as const) {
      await wrapper.setProps({ modal })
      await vi.waitFor(() => expect(document.querySelector(selector)).not.toBeNull())
      button(closeText).click()
    }
    expect(wrapper.emitted('close')!.length).toBeGreaterThanOrEqual(4)

    await wrapper.setProps({ modal: 'confirm-new' })
    await flushPromises()
    button('Restart deal').click()
    button('New Game').click()
    expect(wrapper.emitted('restart')).toHaveLength(1)
    expect(wrapper.emitted('confirm-new-game')).toHaveLength(2)
    wrapper.unmount()
  })
})
