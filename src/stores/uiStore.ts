import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import type { PileLocation } from '@/domain/types/PileType'
import { sameLocation } from '@/domain/types/PileType'

/** A picked-up card (and everything above it) awaiting a destination. */
export interface Selection {
  readonly location: PileLocation
  readonly index: number
}

export type ModalName = 'settings' | 'stats' | 'help' | 'win' | 'confirm-new'

/** Transient interaction state: selection, invalid-move feedback and modals. */
export const useUiStore = defineStore('ui', () => {
  const selection = shallowRef<Selection | null>(null)
  const invalidCardId = ref<string | null>(null)
  const invalidPulse = ref(0)
  const modal = ref<ModalName | null>(null)
  let invalidTimer: ReturnType<typeof setTimeout> | undefined

  function select(location: PileLocation, index: number): void {
    selection.value = { location, index }
  }

  function clearSelection(): void {
    selection.value = null
  }

  function isSelected(location: PileLocation, index: number): boolean {
    const s = selection.value
    return s !== null && sameLocation(s.location, location) && index >= s.index
  }

  /** Briefly marks a card as the subject of an invalid move (shake animation). */
  function flashInvalid(cardId: string | null, durationMs = 450): void {
    clearTimeout(invalidTimer)
    invalidCardId.value = cardId
    invalidPulse.value++
    invalidTimer = setTimeout(() => (invalidCardId.value = null), durationMs)
  }

  function openModal(name: ModalName): void {
    modal.value = name
  }

  function closeModal(): void {
    modal.value = null
  }

  return {
    selection: computed(() => selection.value),
    invalidCardId: computed(() => invalidCardId.value),
    invalidPulse: computed(() => invalidPulse.value),
    modal: computed(() => modal.value),
    select,
    clearSelection,
    isSelected,
    flashInvalid,
    openModal,
    closeModal,
  }
})
