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
  swim: 'bg-swim/12 text-swim',
  bike: 'bg-bike/15 text-bike',
  run: 'bg-run/12 text-run',
  brick: 'bg-ink/8 text-ink',
  strength: 'bg-sand text-muted',
  rest: 'bg-sand text-muted',
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
