<script setup lang="ts">
defineProps<{ elapsed: string; spoken: string }>()
</script>

<template>
  <div class="flex items-baseline gap-1.5" role="timer" :aria-label="`Time ${spoken}`">
    <span class="text-xs tracking-wide uppercase opacity-80" aria-hidden="true">Time</span>
    <span class="timer-display font-mono text-base font-semibold tabular-nums" aria-hidden="true">{{
      elapsed
    }}</span>
  </div>
</template>
