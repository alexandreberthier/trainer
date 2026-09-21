<script setup lang="ts">
import { computed } from 'vue'
import { formatPace } from '@/lib/format'
import { sessionActual } from '@/lib/plan/actual'
import type { Activity, PlannedWorkout } from '@/lib/types'

const props = defineProps<{
  workout: PlannedWorkout
  activities: Activity[]
}>()

const actual = computed(() => sessionActual(props.workout, props.activities))

const statusLabel: Record<string, string> = {
  done: 'Passt',
  short: 'Kürzer als geplant',
  long: 'Länger als geplant',
  missing: 'Noch keine Strava-Einheit',
}
</script>

<template>
  <section class="rounded-2xl border border-line bg-paper p-4">
    <p class="text-xs font-semibold uppercase tracking-wide text-muted">Geplant vs. Strava</p>
    <div class="mt-3 grid gap-3 sm:grid-cols-2">
      <div>
        <p class="text-[11px] uppercase tracking-wide text-muted">Geplant</p>
        <p class="mt-1 text-lg font-semibold tabular-nums">{{ workout.durationMin }} min</p>
        <p class="text-sm text-muted">{{ workout.title }}</p>
      </div>
      <div>
        <p class="text-[11px] uppercase tracking-wide text-muted">Tatsächlich</p>
        <p class="mt-1 text-lg font-semibold tabular-nums">
          {{ actual.status === 'missing' ? '—' : `${actual.actualMin} min` }}
        </p>
        <p v-if="actual.actualDistanceKm" class="text-sm text-muted">
          {{ actual.actualDistanceKm.toFixed(1) }} km
          <span v-if="actual.actualPaceSecPerKm">
            ·
            {{
              workout.sport === 'swim'
                ? formatPace(actual.actualPaceSecPerKm, '/100 m')
                : formatPace(actual.actualPaceSecPerKm)
            }}
          </span>
        </p>
      </div>
    </div>
    <p class="mt-3 text-sm" :class="actual.status === 'missing' ? 'text-muted' : 'text-ink-soft'">
      {{ statusLabel[actual.status] }}. {{ actual.summary }}
    </p>
  </section>
</template>
