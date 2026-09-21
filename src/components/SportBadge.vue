<script setup lang="ts">
import type { Sport } from '@/lib/types'

defineProps<{
  sport: Sport
  compact?: boolean
}>()

const labels: Record<Sport, string> = {
  swim: 'Schwimmen',
  bike: 'Rad',
  run: 'Laufen',
  brick: 'Brick',
  strength: 'Kraft',
  rest: 'Ruhe',
}

const classes: Record<Sport, string> = {
  swim: 'bg-teal/12 text-teal-2',
  bike: 'bg-gold/15 text-ink',
  run: 'bg-coral/12 text-coral',
  brick: 'bg-ink/8 text-ink',
  strength: 'bg-sand-2 text-ink-soft',
  rest: 'bg-sand-2 text-ink-soft',
}
</script>

<template>
  <span
    class="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase"
    :class="classes[sport]"
  >
    {{ compact ? labels[sport].slice(0, 3) : labels[sport] }}
  </span>
</template>
