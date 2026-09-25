import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useUiStore } from '@/stores/uiStore'
import { Locations } from '@/domain/types'

describe('uiStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('manages selection', () => {
    const ui = useUiStore()
    ui.select(Locations.tableau(2), 3)
    expect(ui.selection).toEqual({ location: Locations.tableau(2), index: 3 })
    expect(ui.isSelected(Locations.tableau(2), 4)).toBe(true)
    expect(ui.isSelected(Locations.tableau(2), 2)).toBe(false)
    expect(ui.isSelected(Locations.tableau(1), 4)).toBe(false)
    ui.clearSelection()
    expect(ui.selection).toBeNull()
    expect(ui.isSelected(Locations.tableau(2), 4)).toBe(false)
  })

  it('flashes invalid cards briefly', () => {
    vi.useFakeTimers()
    const ui = useUiStore()
    ui.flashInvalid('hearts-1')
    expect(ui.invalidCardId).toBe('hearts-1')
    expect(ui.invalidPulse).toBe(1)
    vi.advanceTimersByTime(500)
    expect(ui.invalidCardId).toBeNull()
    vi.useRealTimers()
  })

  it('opens and closes modals', () => {
    const ui = useUiStore()
    ui.openModal('stats')
    expect(ui.modal).toBe('stats')
    ui.closeModal()
    expect(ui.modal).toBeNull()
  })
})
