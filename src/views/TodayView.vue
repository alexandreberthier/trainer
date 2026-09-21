<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import WeekStrip from '@/components/WeekStrip.vue'
import WorkoutCard from '@/components/WorkoutCard.vue'
import { diffDays, formatDateLong, formatPace, formatWatts, isoDate } from '@/lib/format'
import { RACE_LABEL, weekWorkouts } from '@/lib/plan/generate'
import { focusFromSports } from '@/lib/sport'
import { useTrainerStore } from '@/stores/trainer'

const store = useTrainerStore()
const today = isoDate(new Date())
const daysToRace = computed(() => (store.plan ? diffDays(today, store.plan.raceDate) : 0))
const phase = computed(() => store.todayWorkouts[0]?.phase ?? weekWorkouts(store.plan, today)[0]?.phase ?? 'base')
const upcoming = computed(() =>
  weekWorkouts(store.plan, today).filter((w) => w.date > today).slice(0, 4),
)
const sports = computed(() => store.profile.enabledSports)
const focus = computed(() => focusFromSports(store.profile.enabledSports))

const phaseLabel: Record<string, string> = {
  base: 'Grundlagen',
  build: 'Aufbau',
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
          <span v-if="focus === 'run'">· Nur Laufen</span>
          <span v-else-if="focus === 'noSwim'">· Ohne Schwimmen</span>
        </p>
      </div>
      <RouterLink to="/app/fitness" class="flex flex-wrap gap-4 rounded-2xl border border-line bg-paper px-4 py-3 text-sm hover:border-ink/15">
        <span v-if="sports.includes('run')">
          <span class="block text-[11px] uppercase tracking-wide text-muted">Lauf</span>
          <span class="font-semibold tabular-nums">{{ formatPace(store.fitness?.run.thresholdPaceSecPerKm) }}</span>
        </span>
        <span v-if="sports.includes('bike')">
          <span class="block text-[11px] uppercase tracking-wide text-muted">FTP</span>
          <span class="font-semibold tabular-nums">{{ formatWatts(store.fitness?.bike.ftpWatts) }}</span>
        </span>
        <span v-if="sports.includes('swim')">
          <span class="block text-[11px] uppercase tracking-wide text-muted">CSS</span>
          <span class="font-semibold tabular-nums">{{ formatPace(store.fitness?.swim.cssSecPer100, '/100m') }}</span>
        </span>
      </RouterLink>
    </div>

    <section class="mt-6">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-lg font-semibold">Diese Woche</h2>
        <RouterLink to="/app/calendar" class="text-sm text-muted hover:text-ink">Ganzer Kalender</RouterLink>
      </div>
      <WeekStrip from="today" />
    </section>

    <section class="mt-8">
      <h2 class="text-lg font-semibold">Heute dran</h2>
      <div v-if="store.todayWorkouts.length" class="mt-3 grid gap-3 md:max-w-xl">
        <WorkoutCard v-for="w in store.todayWorkouts" :key="w.id" :workout="w" from="today" />
      </div>
      <p v-else class="mt-3 rounded-2xl border border-dashed border-line bg-paper px-5 py-8 text-sm text-muted">
        Ruhetag — erholen, schlafen, essen.
      </p>
    </section>

    <section v-if="upcoming.length" class="mt-8 md:max-w-xl">
      <h2 class="text-lg font-semibold">Als Nächstes</h2>
      <ul class="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-paper">
        <li v-for="w in upcoming" :key="w.id">
          <RouterLink :to="{ name: 'workout', params: { id: w.id }, query: { from: 'today', day: w.date } }" class="flex items-center justify-between gap-3 px-4 py-3 hover:bg-sand">
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-wide text-muted">{{ formatDateLong(w.date) }}</p>
              <p class="font-medium">{{ w.title }}</p>
            </div>
            <p class="text-sm tabular-nums text-muted">{{ w.durationMin }} min</p>
          </RouterLink>
        </li>
      </ul>
    </section>
  </main>
</template>
