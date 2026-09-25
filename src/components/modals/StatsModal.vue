<script setup lang="ts">
import { ref } from 'vue'
import { useStatistics } from '@/composables/useStatistics'
import AppModal from '../ui/AppModal.vue'
import AppButton from '../ui/AppButton.vue'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const { rows, reset } = useStatistics()
const confirming = ref(false)

function confirmReset(): void {
  reset()
  confirming.value = false
}
</script>

<template>
  <AppModal :open="open" title="Statistics" panel-class="stats-modal" @close="emit('close')">
    <dl class="grid grid-cols-2 gap-2">
      <div
        v-for="row in rows"
        :key="row.key"
        class="rounded-lg border px-3 py-2"
        style="border-color: var(--surface-border)"
        :data-stat="row.key"
      >
        <dt class="text-xs uppercase" style="color: var(--surface-muted)">{{ row.label }}</dt>
        <dd class="font-mono text-lg font-bold">{{ row.value }}</dd>
      </div>
    </dl>
    <div class="mt-5 flex items-center justify-end gap-2">
      <template v-if="confirming">
        <span class="mr-auto text-sm">Reset all statistics?</span>
        <AppButton variant="surface" @click="confirming = false">Cancel</AppButton>
        <AppButton variant="primary" @click="confirmReset">Reset</AppButton>
      </template>
      <template v-else>
        <AppButton variant="surface" @click="confirming = true">Reset statistics</AppButton>
        <AppButton variant="primary" @click="emit('close')">Done</AppButton>
      </template>
    </div>
  </AppModal>
</template>
