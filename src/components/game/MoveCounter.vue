<script setup lang="ts">
defineProps<{ count: number }>()
</script>

<template>
  <div class="flex items-baseline gap-1.5">
    <span class="text-xs tracking-wide uppercase opacity-80">Moves</span>
    <span class="move-counter font-mono text-base font-semibold tabular-nums">{{ count }}</span>
  </div>
</template>
