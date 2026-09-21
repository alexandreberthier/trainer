<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import WeekStrip from '@/components/WeekStrip.vue'
import WorkoutCard from '@/components/WorkoutCard.vue'
import { diffDays, formatDateLong, formatPace, formatWatts, isoDate } from '@/lib/format'
import { RACE_LABEL } from '@/lib/plan/generate'
import { useTrainerStore } from '@/stores/trainer'

const store = useTrainerStore()
const today = isoDate(new Date())
const daysToRace = computed(() => (store.plan ? diffDays(today, store.plan.raceDate) : 0))
const phase = computed(() => store.todayWorkouts[0]?.phase ?? 'base')

const phaseLabel: Record<string, string> = {
  base: 'Base',
  build: 'Build',
  peak: 'Peak',
  taper: 'Taper',
}
</script>

<template>
  <main class="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">
          {{ store.athleteName ? `Hi ${store.athleteName.split(' ')[0]}` : 'Heute' }}
        </h1>
        <p class="mt-1 text-sm text-muted">
          {{ formatDateLong(today) }}
          · {{ RACE_LABEL[store.profile.raceType] }}
          in {{ daysToRace }} Tagen
          · {{ phaseLabel[phase] }}
        </p>
      </div>
      <RouterLink to="/app/fitness" class="flex gap-4 rounded-2xl border border-line bg-paper px-4 py-3 text-sm hover:border-ink/15">
        <span>
          <span class="block text-[11px] uppercase tracking-wide text-muted">Lauf</span>
          <span class="font-semibold tabular-nums">{{ formatPace(store.fitness?.run.thresholdPaceSecPerKm) }}</span>
        </span>
        <span>
          <span class="block text-[11px] uppercase tracking-wide text-muted">FTP</span>
          <span class="font-semibold tabular-nums">{{ formatWatts(store.fitness?.bike.ftpWatts) }}</span>
        </span>
        <span>
          <span class="block text-[11px] uppercase tracking-wide text-muted">CSS</span>
          <span class="font-semibold tabular-nums">{{ formatPace(store.fitness?.swim.cssSecPer100, '/100m') }}</span>
        </span>
      </RouterLink>
    </div>

    <section class="mt-6">
      <WeekStrip />
    </section>

    <section class="mt-8">
      <h2 class="text-lg font-semibold">Heute</h2>
      <div v-if="store.todayWorkouts.length" class="mt-3 grid gap-3 md:max-w-xl">
        <WorkoutCard v-for="w in store.todayWorkouts" :key="w.id" :workout="w" />
      </div>
      <p v-else class="mt-3 rounded-2xl border border-dashed border-line bg-paper px-5 py-8 text-sm text-muted">
        Ruhetag — oder außerhalb deiner Trainingstage.
      </p>
    </section>
  </main>
</template>
