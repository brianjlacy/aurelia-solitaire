<script setup lang="ts">
import AppIcon from './AppIcon.vue'
import type { IconName } from './icons'

withDefaults(
  defineProps<{
    icon: IconName
    label: string
    /** Visible text; defaults to the label. Hidden on small screens unless `alwaysShowText`. */
    text?: string
    alwaysShowText?: boolean
    shortcut?: string
    disabled?: boolean
    variant?: 'default' | 'primary' | 'surface'
  }>(),
  {
    text: undefined,
    alwaysShowText: false,
    shortcut: undefined,
    disabled: false,
    variant: 'default',
  },
)
</script>

<template>
  <button
    type="button"
    class="btn"
    :class="{ 'btn-primary': variant === 'primary', 'btn-surface': variant === 'surface' }"
    :aria-label="label"
    :aria-keyshortcuts="shortcut"
    :title="shortcut ? `${label} (${shortcut})` : label"
    :disabled="disabled"
  >
    <AppIcon :name="icon" />
    <span :class="alwaysShowText ? '' : 'max-md:sr-only'"
      ><slot>{{ text ?? label }}</slot></span
    >
  </button>
</template>
