<script setup lang="ts">
import { computed } from 'vue'
import WorkoutCard from '@/components/WorkoutCard.vue'
import { diffDays, formatDateLong, formatPace, formatWatts, isoDate } from '@/lib/format'
import { RACE_LABEL, weekWorkouts } from '@/lib/plan/generate'
import { useTrainerStore } from '@/stores/trainer'

const store = useTrainerStore()
const today = isoDate(new Date())
const daysToRace = computed(() => (store.plan ? diffDays(today, store.plan.raceDate) : 0))
const week = computed(() => weekWorkouts(store.plan, today))
const phase = computed(() => store.todayWorkouts[0]?.phase ?? week.value[0]?.phase ?? 'base')

const phaseLabel: Record<string, string> = {
  base: 'Base — Grundlagen',
  build: 'Build — Intensität',
  peak: 'Peak — spezifisch',
  taper: 'Taper — frisch werden',
}
</script>

<template>
  <main class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <p class="text-xs font-semibold uppercase tracking-[0.25em] text-teal">
      {{ store.profile.demoMode ? 'Demo' : store.profile.stravaConnected ? 'Strava' : 'Plan' }}
    </p>
    <h1 class="mt-2 font-display text-4xl sm:text-5xl">
      {{ store.athleteName ? `Hi ${store.athleteName.split(' ')[0]}` : 'Heute' }}
    </h1>
    <p class="mt-2 text-ink-soft">
      {{ formatDateLong(today) }}
      · {{ RACE_LABEL[store.profile.raceType] }}
      <span v-if="store.profile.raceName"> {{ store.profile.raceName }}</span>
      in {{ daysToRace }} Tagen
      · {{ phaseLabel[phase] }}
    </p>

    <section class="mt-8 grid gap-3 sm:grid-cols-3">
      <article class="rounded-2xl bg-teal-2 p-5 text-sand">
        <p class="text-xs uppercase tracking-wider opacity-70">Lauf-Schwelle</p>
        <p class="mt-2 font-display text-3xl">{{ formatPace(store.fitness?.run.thresholdPaceSecPerKm) }}</p>
        <p class="mt-1 text-sm opacity-70">VDOT {{ store.fitness?.run.vdot ?? '—' }}</p>
      </article>
      <article class="rounded-2xl bg-paper p-5">
        <p class="text-xs uppercase tracking-wider text-ink-soft">FTP</p>
        <p class="mt-2 font-display text-3xl">{{ formatWatts(store.fitness?.bike.ftpWatts) }}</p>
        <p class="mt-1 text-sm text-ink-soft">{{ store.fitness?.bike.hasPower ? 'Powermeter' : 'ohne Power' }}</p>
      </article>
      <article class="rounded-2xl bg-paper p-5">
        <p class="text-xs uppercase tracking-wider text-ink-soft">CSS</p>
        <p class="mt-2 font-display text-3xl">{{ formatPace(store.fitness?.swim.cssSecPer100, '/100 m') }}</p>
        <p class="mt-1 text-sm text-ink-soft">{{ store.fitness?.weeklyHours }} h / Woche aktuell</p>
      </article>
    </section>

    <section class="mt-10">
      <h2 class="font-display text-2xl">Heute</h2>
      <div v-if="store.todayWorkouts.length" class="mt-4 grid gap-3 md:grid-cols-2">
        <WorkoutCard v-for="w in store.todayWorkouts" :key="w.id" :workout="w" />
      </div>
      <p v-else class="mt-3 rounded-2xl border border-dashed border-line px-5 py-8 text-ink-soft">
        Kein Training heute — Ruhe oder ein Tag außerhalb deiner Verfügbarkeit.
      </p>
    </section>

    <section class="mt-10">
      <h2 class="font-display text-2xl">Diese Woche</h2>
      <div class="mt-4 grid gap-3 md:grid-cols-2">
        <WorkoutCard v-for="w in week" :key="w.id" :workout="w" />
      </div>
    </section>
  </main>
</template>
