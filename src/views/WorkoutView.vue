<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import ActualCompare from '@/components/ActualCompare.vue'
import IntervalChart from '@/components/IntervalChart.vue'
import SportBadge from '@/components/SportBadge.vue'
import { usePageBack } from '@/composables/usePageBack'
import { WEEKDAYS_DE, formatDateLong, parseIsoDate, weekdayIndex } from '@/lib/format'
import { INTENSITY_LABEL } from '@/lib/sport'
import { useTrainerStore } from '@/stores/trainer'
import type { PlannedWorkout } from '@/lib/types'

const route = useRoute()
const store = useTrainerStore()
const { label, back } = usePageBack()

const workouts = computed(() => store.plan?.workouts ?? [])
const workout = computed(() => workouts.value.find((item) => item.id === route.params.id) ?? null)
const index = computed(() => workouts.value.findIndex((item) => item.id === route.params.id))
const prev = computed(() => (index.value > 0 ? workouts.value[index.value - 1] : null))
const next = computed(() =>
  index.value >= 0 && index.value < workouts.value.length - 1 ? workouts.value[index.value + 1] : null,
)

function siblingTo(item: PlannedWorkout) {
  const from = typeof route.query.from === 'string' ? route.query.from : 'today'
  return {
    name: 'workout' as const,
    params: { id: item.id },
    query: { from, day: item.date },
  }
}

function navLabel(item: PlannedWorkout) {
  return `${WEEKDAYS_DE[weekdayIndex(item.date)]} ${parseIsoDate(item.date).getDate()}.`
}
</script>

<template>
  <main class="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <button type="button" class="text-sm text-muted hover:text-ink" @click="back">‹ {{ label }}</button>
      <div class="flex items-center gap-3 text-sm">
        <RouterLink v-if="prev" :to="siblingTo(prev)" replace class="text-muted hover:text-ink">
          ‹ {{ navLabel(prev) }}
        </RouterLink>
        <RouterLink v-if="next" :to="siblingTo(next)" replace class="text-muted hover:text-ink">
          {{ navLabel(next) }} ›
        </RouterLink>
      </div>
    </div>

    <article v-if="workout" class="mt-5">
      <SportBadge :sport="workout.sport" />
      <h1 class="mt-3 text-3xl font-semibold tracking-tight">{{ workout.title }}</h1>
      <p class="mt-2 text-sm text-muted">
        {{ formatDateLong(workout.date) }} · {{ workout.durationMin }} min · {{ INTENSITY_LABEL[workout.intensity] }}
      </p>
      <p class="mt-4 leading-relaxed">{{ workout.description }}</p>

      <div class="mt-6">
        <ActualCompare :workout="workout" :activities="store.activities" />
      </div>

      <div class="mt-8">
        <IntervalChart :workout="workout" />
      </div>
    </article>

    <p v-else class="mt-10 text-muted">Einheit nicht gefunden.</p>
  </main>
</template>
