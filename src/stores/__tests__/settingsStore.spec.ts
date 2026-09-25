import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import {
  DEFAULT_SETTINGS,
  sanitizeSettings,
  SETTINGS_STORAGE_KEY,
  useSettingsStore,
} from '@/stores/settingsStore'

describe('settingsStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('starts with defaults', () => {
    const store = useSettingsStore()
    expect(store.settings).toEqual(DEFAULT_SETTINGS)
    expect(store.drawCount).toBe(3)
    expect(store.theme).toBe('system')
    expect(store.cardBack).toBe('blue')
    expect(store.showTimer).toBe(true)
    expect(store.soundEnabled).toBe(true)
    expect(store.volume).toBe(0.6)
    expect(store.hintLimit).toBe(0)
  })

  it('updates, sanitises and persists', async () => {
    const store = useSettingsStore()
    store.update({ drawCount: 1, theme: 'dark', volume: 5 })
    expect(store.drawCount).toBe(1)
    expect(store.volume).toBe(1)
    await nextTick()
    const saved = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY)!)
    expect(saved).toMatchObject({ version: 1, data: { drawCount: 1, theme: 'dark' } })

    setActivePinia(createPinia())
    expect(useSettingsStore().theme).toBe('dark')
  })

  it('resets to defaults', () => {
    const store = useSettingsStore()
    store.update({ cardBack: 'red' })
    store.reset()
    expect(store.settings).toEqual(DEFAULT_SETTINGS)
  })

  it('ignores corrupt storage', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ version: 1, data: 'x' }))
    expect(useSettingsStore().settings).toEqual(DEFAULT_SETTINGS)
  })
})

describe('sanitizeSettings', () => {
  it('keeps valid fields and replaces invalid ones', () => {
    expect(
      sanitizeSettings({
        drawCount: 2,
        theme: 'neon',
        cardBack: 'green',
        showTimer: 'yes',
        soundEnabled: false,
        volume: -1,
        hintLimit: 3,
      }),
    ).toEqual({
      ...DEFAULT_SETTINGS,
      cardBack: 'green',
      soundEnabled: false,
      volume: 0,
      hintLimit: 3,
    })
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS)
    expect(sanitizeSettings({ volume: NaN })).toEqual(DEFAULT_SETTINGS)
    expect(sanitizeSettings({ showTimer: false }).showTimer).toBe(false)
  })
})
