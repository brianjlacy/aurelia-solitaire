<script setup lang="ts">
import AppModal from '../ui/AppModal.vue'
import AppButton from '../ui/AppButton.vue'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const SHORTCUTS: [string, string][] = [
  ['Tab / Shift+Tab', 'Move between piles'],
  ['Arrow keys', 'Move between piles and cards'],
  ['Enter / Space', 'Pick up a card, then drop it on the focused pile'],
  ['Double-click', 'Send a card to its foundation'],
  ['Ctrl+Z / Ctrl+Y', 'Undo / redo'],
  ['N', 'New game'],
  ['H', 'Hint'],
  ['?', 'This help'],
  ['Esc', 'Cancel drag or selection, close dialogs'],
]
</script>

<template>
  <AppModal
    :open="open"
    title="How to play"
    panel-class="help-modal max-w-lg"
    @close="emit('close')"
  >
    <div class="space-y-3 text-sm leading-relaxed">
      <p>Build each foundation up by suit from Ace to King. You win when all four are complete.</p>
      <ul class="list-disc space-y-1 pl-5">
        <li>
          In the columns, stack cards in descending order with alternating colours (red on black).
        </li>
        <li>Only a King may fill an empty column.</li>
        <li>Move a face-up run of cards together; hidden cards turn over when uncovered.</li>
        <li>Click the stock to draw cards; click it when empty to turn the waste over.</li>
        <li>Drag cards, or tap a card and then tap where it should go.</li>
      </ul>
      <h3 class="pt-2 font-semibold">Keyboard</h3>
      <table class="w-full text-left">
        <caption class="sr-only">
          Keyboard shortcuts
        </caption>
        <tbody>
          <tr
            v-for="[keys, action] in SHORTCUTS"
            :key="keys"
            class="border-t"
            style="border-color: var(--surface-border)"
          >
            <th scope="row" class="py-1.5 pr-3 font-mono text-xs font-semibold whitespace-nowrap">
              {{ keys }}
            </th>
            <td class="py-1.5">{{ action }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="mt-5 flex justify-end">
      <AppButton variant="primary" @click="emit('close')">Got it</AppButton>
    </div>
  </AppModal>
</template>
