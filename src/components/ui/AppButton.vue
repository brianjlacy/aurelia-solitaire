<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'default' | 'primary' | 'surface'
    type?: 'button' | 'submit'
    disabled?: boolean
  }>(),
  { variant: 'default', type: 'button', disabled: false },
)
</script>

<template>
  <button
    :type="type"
    class="btn"
    :class="{ 'btn-primary': variant === 'primary', 'btn-surface': variant === 'surface' }"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>
