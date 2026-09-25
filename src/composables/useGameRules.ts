import { computed } from 'vue'
import {
  FOUNDATION_COUNT,
  locationKey,
  Locations,
  TABLEAU_COUNT,
  type PileLocation,
} from '@/domain/types/PileType'
import { useGameStore } from '@/stores/gameStore'
import { useUiStore, type Selection } from '@/stores/uiStore'

const ALL_TARGETS: readonly PileLocation[] = [
  ...Array.from({ length: FOUNDATION_COUNT }, (_, i) => Locations.foundation(i)),
  ...Array.from({ length: TABLEAU_COUNT }, (_, i) => Locations.tableau(i)),
]

/** Rule queries for the UI: which piles accept the current selection. */
export function useGameRules() {
  const game = useGameStore()
  const ui = useUiStore()

  function validTargetsFor(source: Selection | null): Set<string> {
    if (!source) return new Set()
    return new Set(
      ALL_TARGETS.filter(
        (to) => game.validate({ from: source.location, cardIndex: source.index, to }).valid,
      ).map(locationKey),
    )
  }

  const validTargets = computed(() => validTargetsFor(ui.selection))

  return {
    validTargets,
    validTargetsFor,
    isValidTarget: (location: PileLocation) => validTargets.value.has(locationKey(location)),
    canPickUp: game.canPickUp,
  }
}
