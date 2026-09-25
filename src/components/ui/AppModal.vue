<script setup lang="ts">
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import AppIcon from './AppIcon.vue'

withDefaults(
  defineProps<{
    open: boolean
    title: string
    panelClass?: string
    /** Hide the close (×) button, e.g. for dialogs with explicit choices. */
    hideClose?: boolean
  }>(),
  { panelClass: '', hideClose: false },
)

const emit = defineEmits<{ (e: 'close'): void }>()
</script>

<template>
  <TransitionRoot appear :show="open" as="template">
    <Dialog class="fixed inset-0 z-[1800]" @close="emit('close')">
      <TransitionChild
        as="template"
        enter="duration-200 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-150 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black/60" aria-hidden="true" />
      </TransitionChild>
      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
          <TransitionChild
            as="template"
            enter="duration-200 ease-out"
            enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100"
            leave="duration-150 ease-in"
            leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95"
          >
            <DialogPanel
              class="relative w-full max-w-md rounded-2xl border p-6 shadow-2xl"
              :class="panelClass"
              style="
                background: var(--surface-bg);
                color: var(--surface-text);
                border-color: var(--surface-border);
              "
            >
              <DialogTitle as="h2" class="mb-4 pr-8 text-xl font-bold">{{ title }}</DialogTitle>
              <button
                v-if="!hideClose"
                type="button"
                class="btn btn-surface absolute top-4 right-4 !min-h-0 !p-1.5"
                aria-label="Close"
                @click="emit('close')"
              >
                <AppIcon name="close" />
              </button>
              <slot />
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
