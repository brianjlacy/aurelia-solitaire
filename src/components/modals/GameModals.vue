<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import type { DrawCount } from '@/domain/models/GameState'
import type { ModalName } from '@/stores/uiStore'
import ConfirmNewGameModal from './ConfirmNewGameModal.vue'

defineProps<{ modal: ModalName | null; drawCount: DrawCount }>()
const emit = defineEmits<{
  (e: 'close' | 'new-game' | 'confirm-new-game' | 'restart'): void
  (e: 'open', name: ModalName): void
}>()

// Rarely-opened dialogs are split into separate chunks.
const WinModal = defineAsyncComponent(() => import('./WinModal.vue'))
const SettingsModal = defineAsyncComponent(() => import('./SettingsModal.vue'))
const StatsModal = defineAsyncComponent(() => import('./StatsModal.vue'))
const HelpModal = defineAsyncComponent(() => import('./HelpModal.vue'))
</script>

<template>
  <WinModal
    v-if="modal === 'win'"
    :open="true"
    @close="emit('close')"
    @new-game="emit('confirm-new-game')"
    @stats="emit('open', 'stats')"
  />
  <SettingsModal
    v-if="modal === 'settings'"
    :open="true"
    :current-draw-count="drawCount"
    @close="emit('close')"
  />
  <StatsModal v-if="modal === 'stats'" :open="true" @close="emit('close')" />
  <HelpModal v-if="modal === 'help'" :open="true" @close="emit('close')" />
  <ConfirmNewGameModal
    :open="modal === 'confirm-new'"
    @close="emit('close')"
    @confirm="emit('confirm-new-game')"
    @restart="emit('restart')"
  />
</template>
