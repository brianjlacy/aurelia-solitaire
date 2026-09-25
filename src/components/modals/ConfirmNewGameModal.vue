<script setup lang="ts">
import AppModal from '../ui/AppModal.vue'
import AppButton from '../ui/AppButton.vue'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'close' | 'confirm' | 'restart'): void }>()
</script>

<template>
  <AppModal
    :open="open"
    title="Start a new game?"
    panel-class="confirm-modal"
    @close="emit('close')"
  >
    <p class="mb-5 text-sm" style="color: var(--surface-muted)">
      Your current game will count as a loss. You can also restart this deal from the beginning.
    </p>
    <div class="flex flex-wrap justify-end gap-2">
      <AppButton variant="surface" @click="emit('close')">Keep playing</AppButton>
      <AppButton variant="surface" @click="emit('restart')">Restart deal</AppButton>
      <AppButton variant="primary" @click="emit('confirm')">New Game</AppButton>
    </div>
  </AppModal>
</template>
