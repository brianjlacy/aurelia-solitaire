<script setup lang="ts">
import { useAnnouncer } from '@/composables/useAnnouncer'
import { useTheme } from '@/composables/useTheme'
import AppFooter from '@/components/AppFooter.vue'
import GameBoard from '@/components/game/GameBoard.vue'

useTheme()
const { announcement } = useAnnouncer()
</script>

<template>
  <a href="#main" class="skip-link">Skip to game</a>
  <GameBoard />
  <AppFooter />
  <div role="status" aria-live="polite" aria-atomic="true" class="sr-only" data-testid="announcer">
    {{ announcement }}
  </div>
</template>
