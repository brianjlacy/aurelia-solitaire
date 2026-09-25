<script setup lang="ts">
import { computed } from 'vue'
import type { Card } from '@/domain/models/Card'

const props = defineProps<{ card: Card }>()

const isFaceCard = computed(() => props.card.rank > 10)
</script>

<template>
  <div class="card-front" :class="`suit-${card.suit}`" aria-hidden="true">
    <span class="card-corner card-corner--top">
      <span class="card-rank">{{ card.displayRank }}</span>
      <span class="card-suit">{{ card.suitSymbol }}</span>
    </span>
    <span v-if="isFaceCard" class="card-center card-center--face">
      {{ card.displayRank }}<span class="card-center-suit">{{ card.suitSymbol }}</span>
    </span>
    <span v-else class="card-center">{{ card.suitSymbol }}</span>
    <span class="card-corner card-corner--bottom">
      <span class="card-rank">{{ card.displayRank }}</span>
      <span class="card-suit">{{ card.suitSymbol }}</span>
    </span>
  </div>
</template>
