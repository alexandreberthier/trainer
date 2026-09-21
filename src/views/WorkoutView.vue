<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import IntervalChart from '@/components/IntervalChart.vue'
import SportBadge from '@/components/SportBadge.vue'
import { formatDateLong } from '@/lib/format'
import { INTENSITY_LABEL } from '@/lib/sport'
import { useTrainerStore } from '@/stores/trainer'

const route = useRoute()
const store = useTrainerStore()

const workout = computed(() => store.plan?.workouts.find((w) => w.id === route.params.id) ?? null)
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

      <div class="mt-8">
        <IntervalChart :workout="workout" />
      </div>
    </article>

    <p v-else class="mt-10 text-muted">Einheit nicht gefunden.</p>
  </main>
</template>
