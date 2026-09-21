<script setup lang="ts">
import { RouterLink } from 'vue-router'
import IntervalChart from './IntervalChart.vue'
import SportBadge from './SportBadge.vue'
import ActualStatus from './ActualStatus.vue'
import type { PlannedWorkout } from '@/lib/types'
import { INTENSITY_LABEL } from '@/lib/sport'
import { useTrainerStore } from '@/stores/trainer'

withDefaults(
  defineProps<{
    workout: PlannedWorkout
    from?: string
  }>(),
  { from: 'today' },
)

const store = useTrainerStore()
</script>

<template>
  <RouterLink
    :to="{ name: 'workout', params: { id: workout.id }, query: { from, day: workout.date } }"
    class="block rounded-2xl border border-line bg-paper p-4 text-left shadow-sm transition hover:border-ink/15 hover:shadow"
  >
    <div class="flex items-start justify-between gap-3">
      <div>
        <div class="flex flex-wrap items-center gap-2">
          <SportBadge :sport="workout.sport" />
          <span class="text-[11px] font-semibold uppercase tracking-wide text-muted">{{ INTENSITY_LABEL[workout.intensity] }}</span>
          <ActualStatus :workout="workout" :activities="store.activities" />
        </div>
        <h3 class="mt-2 text-lg font-semibold leading-tight">{{ workout.title }}</h3>
      </div>
      <p class="shrink-0 text-sm tabular-nums text-muted">{{ workout.durationMin }} min</p>
    </div>
    <p class="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{{ workout.description }}</p>
    <div class="mt-3">
      <IntervalChart :workout="workout" compact />
    </div>
  </RouterLink>
</template>
