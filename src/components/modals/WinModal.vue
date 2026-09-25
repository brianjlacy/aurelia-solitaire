<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { useStatsStore } from '@/stores/statsStore'
import { formatDuration } from '@/utils/format'
import AppModal from '../ui/AppModal.vue'
import AppButton from '../ui/AppButton.vue'
import AppIcon from '../ui/AppIcon.vue'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'close' | 'new-game' | 'stats'): void }>()

const game = useGameStore()
const stats = useStatsStore()

const isBestTime = computed(() => stats.stats.bestTimeMs === game.elapsedMs)
const isFewestMoves = computed(() => stats.stats.fewestMoves === game.moveCount)
</script>

<template>
  <AppModal
    :open="open"
    title="You Won!"
    panel-class="win-modal text-center"
    @close="emit('close')"
  >
    <div class="mb-3 flex justify-center text-yellow-400" aria-hidden="true">
      <AppIcon name="trophy" class="h-14 w-14" />
    </div>
    <p class="mb-5" style="color: var(--surface-muted)">Every card is home. Congratulations!</p>
    <dl class="mb-6 grid grid-cols-3 gap-3">
      <div class="rounded-lg border p-3" style="border-color: var(--surface-border)">
        <dt class="text-xs uppercase" style="color: var(--surface-muted)">Time</dt>
        <dd class="font-mono text-lg font-bold">{{ formatDuration(game.elapsedMs) }}</dd>
        <dd v-if="isBestTime" class="text-xs font-semibold text-yellow-500">Best!</dd>
      </div>
      <div class="rounded-lg border p-3" style="border-color: var(--surface-border)">
        <dt class="text-xs uppercase" style="color: var(--surface-muted)">Moves</dt>
        <dd class="font-mono text-lg font-bold">{{ game.moveCount }}</dd>
        <dd v-if="isFewestMoves" class="text-xs font-semibold text-yellow-500">Best!</dd>
      </div>
      <div class="rounded-lg border p-3" style="border-color: var(--surface-border)">
        <dt class="text-xs uppercase" style="color: var(--surface-muted)">Streak</dt>
        <dd class="font-mono text-lg font-bold">{{ stats.stats.currentStreak }}</dd>
      </div>
    </dl>
    <div class="flex justify-center gap-2">
      <AppButton variant="surface" @click="emit('stats')">View statistics</AppButton>
      <AppButton variant="primary" @click="emit('new-game')">New Game</AppButton>
    </div>
  </AppModal>
</template>
