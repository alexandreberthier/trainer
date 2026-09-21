<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import IntervalChart from '@/components/IntervalChart.vue'
import SportBadge from '@/components/SportBadge.vue'
import { formatDateLong } from '@/lib/format'
import { INTENSITY_LABEL } from '@/lib/sport'
import { workoutSegments } from '@/lib/workout-graph'
import { useTrainerStore } from '@/stores/trainer'

const route = useRoute()
const store = useTrainerStore()

const workout = computed(() => store.plan?.workouts.find((w) => w.id === route.params.id) ?? null)
const segments = computed(() => (workout.value ? workoutSegments(workout.value) : []))
</script>

<template>
  <main class="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
    <RouterLink to="/app" class="text-sm text-muted hover:text-ink">← Heute</RouterLink>

    <article v-if="workout" class="mt-5">
      <SportBadge :sport="workout.sport" />
      <h1 class="mt-3 text-3xl font-semibold tracking-tight">{{ workout.title }}</h1>
      <p class="mt-2 text-sm text-muted">
        {{ formatDateLong(workout.date) }} · {{ workout.durationMin }} min · {{ INTENSITY_LABEL[workout.intensity] }}
      </p>
      <p class="mt-4 leading-relaxed">{{ workout.description }}</p>

      <div class="mt-6">
        <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Ablauf</p>
        <IntervalChart :workout="workout" />
      </div>

      <ol class="mt-6 space-y-2">
        <li v-for="(seg, i) in segments" :key="i" class="flex items-start gap-3 rounded-2xl border border-line bg-paper p-4">
          <span class="mt-0.5 w-6 shrink-0 text-xs font-semibold tabular-nums text-muted">{{ i + 1 }}</span>
          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-3">
              <h2 class="font-semibold">{{ seg.label }}</h2>
              <p class="shrink-0 text-sm tabular-nums text-muted">{{ Math.round(seg.durationMin * 10) / 10 }} min</p>
            </div>
            <p class="mt-1 text-sm text-muted">{{ INTENSITY_LABEL[seg.intensity] }} · {{ seg.target }}</p>
          </div>
        </li>
      </ol>
    </article>

    <p v-else class="mt-10 text-muted">Einheit nicht gefunden.</p>
  </main>
</template>
