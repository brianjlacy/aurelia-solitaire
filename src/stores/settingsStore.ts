import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { DrawCount } from '@/domain/models/GameState'
import { isRecord, PersistedValue } from '@/utils/storage'

export const THEMES = ['system', 'classic', 'dark', 'high-contrast'] as const
export type Theme = (typeof THEMES)[number]

export const CARD_BACKS = ['blue', 'red', 'green', 'purple'] as const
export type CardBack = (typeof CARD_BACKS)[number]

/** Hints allowed per game; `0` means unlimited. */
export const HINT_LIMITS = [0, 3, 5, 10] as const
export type HintLimit = (typeof HINT_LIMITS)[number]

export interface Settings {
  drawCount: DrawCount
  theme: Theme
  cardBack: CardBack
  showTimer: boolean
  soundEnabled: boolean
  /** 0–1 */
  volume: number
  hintLimit: HintLimit
}

export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
  drawCount: 3,
  theme: 'system',
  cardBack: 'blue',
  showTimer: true,
  soundEnabled: true,
  volume: 0.6,
  hintLimit: 0,
})

function pick<T>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

/**
 * Sanitises untrusted settings, keeping each valid field and falling back to
 * the default for anything missing or malformed.
 */
export function sanitizeSettings(data: unknown): Settings {
  const d = isRecord(data) ? data : {}
  const volume =
    typeof d.volume === 'number' && Number.isFinite(d.volume)
      ? Math.min(1, Math.max(0, d.volume))
      : DEFAULT_SETTINGS.volume
  return {
    drawCount: pick(d.drawCount, [1, 3] as const, DEFAULT_SETTINGS.drawCount),
    theme: pick(d.theme, THEMES, DEFAULT_SETTINGS.theme),
    cardBack: pick(d.cardBack, CARD_BACKS, DEFAULT_SETTINGS.cardBack),
    showTimer: typeof d.showTimer === 'boolean' ? d.showTimer : DEFAULT_SETTINGS.showTimer,
    soundEnabled:
      typeof d.soundEnabled === 'boolean' ? d.soundEnabled : DEFAULT_SETTINGS.soundEnabled,
    volume,
    hintLimit: pick(d.hintLimit, HINT_LIMITS, DEFAULT_SETTINGS.hintLimit),
  }
}

export const SETTINGS_STORAGE_KEY = 'solitaire-settings'

/** User preferences, persisted to localStorage. */
export const useSettingsStore = defineStore('settings', () => {
  const persisted = new PersistedValue<Settings>({
    key: SETTINGS_STORAGE_KEY,
    version: 1,
    validate: (data) => (isRecord(data) ? sanitizeSettings(data) : null),
  })

  const settings = ref<Settings>({ ...DEFAULT_SETTINGS, ...persisted.load() })

  watch(settings, (value) => persisted.save({ ...value }), { deep: true })

  /** Applies a partial update after sanitising it. */
  function update(patch: Partial<Settings>): void {
    settings.value = sanitizeSettings({ ...settings.value, ...patch })
  }

  function reset(): void {
    settings.value = { ...DEFAULT_SETTINGS }
  }

  return {
    settings: computed(() => settings.value),
    drawCount: computed(() => settings.value.drawCount),
    theme: computed(() => settings.value.theme),
    cardBack: computed(() => settings.value.cardBack),
    showTimer: computed(() => settings.value.showTimer),
    soundEnabled: computed(() => settings.value.soundEnabled),
    volume: computed(() => settings.value.volume),
    hintLimit: computed(() => settings.value.hintLimit),
    update,
    reset,
  }
})
