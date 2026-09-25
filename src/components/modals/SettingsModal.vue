<script setup lang="ts">
import { computed } from 'vue'
import {
  CARD_BACKS,
  HINT_LIMITS,
  THEMES,
  useSettingsStore,
  type CardBack,
  type HintLimit,
  type Theme,
} from '@/stores/settingsStore'
import type { DrawCount } from '@/domain/models/GameState'
import AppModal from '../ui/AppModal.vue'
import AppButton from '../ui/AppButton.vue'

defineProps<{ open: boolean; currentDrawCount: DrawCount }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const settings = useSettingsStore()

const THEME_LABELS: Record<Theme, string> = {
  system: 'Match system',
  classic: 'Classic green',
  dark: 'Dark',
  'high-contrast': 'High contrast',
}
const BACK_LABELS: Record<CardBack, string> = {
  blue: 'Blue',
  red: 'Red',
  green: 'Green',
  purple: 'Purple',
}
const HINT_LABELS: Record<HintLimit, string> = {
  0: 'Unlimited',
  3: '3 per game',
  5: '5 per game',
  10: '10 per game',
}

const volumePercent = computed({
  get: () => Math.round(settings.volume * 100),
  set: (value: number) => settings.update({ volume: value / 100 }),
})
</script>

<template>
  <AppModal :open="open" title="Settings" panel-class="settings-modal" @close="emit('close')">
    <form class="space-y-5" @submit.prevent="emit('close')">
      <fieldset>
        <legend class="mb-2 text-sm font-semibold">Draw from stock</legend>
        <div class="flex gap-4">
          <label v-for="count in [1, 3] as const" :key="count" class="flex items-center gap-2">
            <input
              type="radio"
              name="draw-count"
              :value="count"
              :checked="settings.drawCount === count"
              @change="settings.update({ drawCount: count })"
            />
            {{ count === 1 ? 'One card (easy)' : 'Three cards (standard)' }}
          </label>
        </div>
        <p
          v-if="settings.drawCount !== currentDrawCount"
          class="mt-1 text-xs"
          style="color: var(--surface-muted)"
        >
          Takes effect when you start a new game.
        </p>
      </fieldset>

      <div class="grid grid-cols-2 gap-4">
        <label class="flex flex-col gap-1 text-sm font-semibold">
          Theme
          <select
            class="rounded-md border px-2 py-1.5 font-normal"
            style="background: var(--surface-bg); border-color: var(--surface-border)"
            :value="settings.theme"
            @change="
              settings.update({ theme: ($event.target as HTMLSelectElement).value as Theme })
            "
          >
            <option v-for="theme in THEMES" :key="theme" :value="theme">
              {{ THEME_LABELS[theme] }}
            </option>
          </select>
        </label>
        <label class="flex flex-col gap-1 text-sm font-semibold">
          Card back
          <select
            class="rounded-md border px-2 py-1.5 font-normal"
            style="background: var(--surface-bg); border-color: var(--surface-border)"
            :value="settings.cardBack"
            @change="
              settings.update({ cardBack: ($event.target as HTMLSelectElement).value as CardBack })
            "
          >
            <option v-for="back in CARD_BACKS" :key="back" :value="back">
              {{ BACK_LABELS[back] }}
            </option>
          </select>
        </label>
        <label class="col-span-2 flex flex-col gap-1 text-sm font-semibold">
          Hints
          <select
            class="rounded-md border px-2 py-1.5 font-normal"
            style="background: var(--surface-bg); border-color: var(--surface-border)"
            :value="settings.hintLimit"
            @change="
              settings.update({
                hintLimit: Number(($event.target as HTMLSelectElement).value) as HintLimit,
              })
            "
          >
            <option v-for="limit in HINT_LIMITS" :key="limit" :value="limit">
              {{ HINT_LABELS[limit] }}
            </option>
          </select>
        </label>
      </div>

      <fieldset class="space-y-2">
        <legend class="mb-1 text-sm font-semibold">Display &amp; sound</legend>
        <label class="flex items-center gap-2">
          <input
            type="checkbox"
            :checked="settings.showTimer"
            @change="settings.update({ showTimer: ($event.target as HTMLInputElement).checked })"
          />
          Show timer
        </label>
        <label class="flex items-center gap-2">
          <input
            type="checkbox"
            :checked="settings.soundEnabled"
            @change="settings.update({ soundEnabled: ($event.target as HTMLInputElement).checked })"
          />
          Sound effects
        </label>
        <label class="flex items-center gap-3 text-sm">
          <span class="w-14">Volume</span>
          <input
            v-model.number="volumePercent"
            type="range"
            min="0"
            max="100"
            step="5"
            class="flex-1"
            :disabled="!settings.soundEnabled"
            :aria-valuetext="`${volumePercent}%`"
          />
          <span class="w-10 text-right font-mono" aria-hidden="true">{{ volumePercent }}%</span>
        </label>
      </fieldset>

      <div class="flex justify-between gap-2">
        <AppButton variant="surface" @click="settings.reset()">Restore defaults</AppButton>
        <AppButton variant="primary" type="submit">Done</AppButton>
      </div>
    </form>
  </AppModal>
</template>
