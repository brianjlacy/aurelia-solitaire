<script setup lang="ts">
import AppButton from '../ui/AppButton.vue'
import AppIcon from '../ui/AppIcon.vue'
import IconButton from '../ui/IconButton.vue'

defineProps<{
  canUndo: boolean
  canRedo: boolean
  canHint: boolean
  canAutoComplete: boolean
  hintsRemaining: number | null
}>()

const emit = defineEmits<{
  (e: 'new-game' | 'undo' | 'redo' | 'hint' | 'auto-complete' | 'stats' | 'settings' | 'help'): void
}>()
</script>

<template>
  <nav class="flex flex-wrap items-center gap-1.5" aria-label="Game controls">
    <AppButton
      variant="primary"
      aria-keyshortcuts="N"
      title="New Game (N)"
      @click="emit('new-game')"
    >
      <AppIcon name="newGame" />
      <span>New Game</span>
    </AppButton>
    <IconButton
      icon="undo"
      label="Undo"
      shortcut="Control+Z"
      :disabled="!canUndo"
      @click="emit('undo')"
    />
    <IconButton
      icon="redo"
      label="Redo"
      shortcut="Control+Y"
      :disabled="!canRedo"
      @click="emit('redo')"
    />
    <IconButton icon="hint" label="Hint" shortcut="H" :disabled="!canHint" @click="emit('hint')">
      Hint<template v-if="hintsRemaining !== null"> ({{ hintsRemaining }})</template>
    </IconButton>
    <IconButton
      v-if="canAutoComplete"
      icon="autoComplete"
      label="Auto-complete"
      variant="primary"
      always-show-text
      @click="emit('auto-complete')"
    />
    <span class="mx-0.5 hidden h-6 w-px bg-white/25 sm:block" aria-hidden="true" />
    <IconButton icon="stats" label="Statistics" text="Stats" @click="emit('stats')" />
    <IconButton icon="settings" label="Settings" @click="emit('settings')" />
    <IconButton icon="help" label="Help" shortcut="?" @click="emit('help')" />
  </nav>
</template>
