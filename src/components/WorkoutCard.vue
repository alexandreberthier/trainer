<script setup lang="ts">
import { RouterLink } from 'vue-router'
import SportBadge from './SportBadge.vue'
import type { PlannedWorkout } from '@/lib/types'

defineProps<{
  workout: PlannedWorkout
}>()
</script>

<template>
  <RouterLink
    :to="{ name: 'workout', params: { id: workout.id } }"
    class="block rounded-2xl border border-line bg-paper p-4 text-left shadow-sm transition hover:border-ink/15 hover:shadow"
  >
    <div class="flex items-start justify-between gap-3">
      <div>
        <SportBadge :sport="workout.sport" />
        <h3 class="mt-2 text-lg font-semibold leading-tight">{{ workout.title }}</h3>
      </div>
      <p class="shrink-0 text-sm tabular-nums text-muted">{{ workout.durationMin }} min</p>
    </div>
    <p class="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{{ workout.description }}</p>
  </RouterLink>
</template>
