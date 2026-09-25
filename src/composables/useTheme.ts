import { computed, watchEffect } from 'vue'
import { usePreferredDark } from '@vueuse/core'
import { useSettingsStore, type Theme } from '@/stores/settingsStore'

export type ResolvedTheme = Exclude<Theme, 'system'>

/** Applies the selected theme and card back to `<html>` as data attributes. */
export function useTheme(root: HTMLElement = document.documentElement) {
  const settings = useSettingsStore()
  const prefersDark = usePreferredDark()

  const resolvedTheme = computed<ResolvedTheme>(() =>
    settings.theme === 'system' ? (prefersDark.value ? 'dark' : 'classic') : settings.theme,
  )

  watchEffect(() => {
    root.dataset.theme = resolvedTheme.value
    root.dataset.cardBack = settings.cardBack
    root.style.colorScheme = resolvedTheme.value === 'classic' ? 'light' : 'dark'
  })

  return { resolvedTheme }
}
