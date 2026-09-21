<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import SportBadge from '@/components/SportBadge.vue'
import { MONTHS_DE, WEEKDAYS_DE, addDays, isoDate, parseIsoDate, startOfWeekMonday, weekdayIndex } from '@/lib/format'
import { SPORT_DOT } from '@/lib/sport'
import { workoutsOn } from '@/lib/plan/generate'
import { useTrainerStore } from '@/stores/trainer'
import type { PlannedWorkout } from '@/lib/types'

const store = useTrainerStore()
const cursor = ref(isoDate(new Date()))
const selected = ref(isoDate(new Date()))

const monthLabel = computed(() => {
  const d = parseIsoDate(cursor.value)
  return `${MONTHS_DE[d.getMonth()]} ${d.getFullYear()}`
})

const cells = computed(() => {
  const d = parseIsoDate(cursor.value)
  const first = isoDate(new Date(d.getFullYear(), d.getMonth(), 1))
  const start = startOfWeekMonday(first)
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  const endMonday = startOfWeekMonday(isoDate(last))
  const end = addDays(endMonday, 6)
  const out: string[] = []
  let cur = start
  while (cur <= end) {
    out.push(cur)
    cur = addDays(cur, 1)
  }
  return out
})

const selectedWorkouts = computed(() => workoutsOn(store.plan, selected.value))

function inMonth(iso: string) {
  return parseIsoDate(iso).getMonth() === parseIsoDate(cursor.value).getMonth()
}

function shiftMonth(delta: number) {
  const d = parseIsoDate(cursor.value)
  d.setMonth(d.getMonth() + delta, 1)
  cursor.value = isoDate(d)
}

function dayWorkouts(iso: string): PlannedWorkout[] {
  return workoutsOn(store.plan, iso)
}

const today = isoDate(new Date())
</script>

<template>
  <main class="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
    <div class="flex items-center justify-between gap-4">
      <h1 class="text-3xl font-semibold tracking-tight">{{ monthLabel }}</h1>
      <div class="flex gap-2">
        <button type="button" class="rounded-lg border border-line bg-paper px-3 py-1.5 text-sm" @click="shiftMonth(-1)">←</button>
        <button type="button" class="rounded-lg border border-line bg-paper px-3 py-1.5 text-sm" @click="cursor = today; selected = today">Heute</button>
        <button type="button" class="rounded-lg border border-line bg-paper px-3 py-1.5 text-sm" @click="shiftMonth(1)">→</button>
      </div>
    </div>

    <div class="mt-6 overflow-x-auto">
      <div class="grid min-w-[640px] grid-cols-7 gap-px rounded-2xl border border-line bg-line">
        <div v-for="d in WEEKDAYS_DE" :key="d" class="bg-paper py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted">
          {{ d }}
        </div>
        <button
          v-for="day in cells"
          :key="day"
          type="button"
          class="min-h-[88px] bg-paper p-2 text-left transition hover:bg-sand"
          :class="[
            inMonth(day) ? '' : 'opacity-35',
            selected === day ? 'bg-sand' : '',
            day === today ? 'ring-1 ring-inset ring-strava' : '',
          ]"
          @click="selected = day"
        >
          <span class="text-sm font-semibold tabular-nums">{{ parseIsoDate(day).getDate() }}</span>
          <div class="mt-2 flex flex-wrap gap-1">
            <span
              v-for="w in dayWorkouts(day)"
              :key="w.id"
              class="h-2 w-2 rounded-full"
              :class="SPORT_DOT[w.sport]"
              :title="w.title"
            />
          </div>
        </button>
      </div>
    </div>

    <section class="mt-6 rounded-2xl border border-line bg-paper p-5">
      <p class="text-xs font-semibold uppercase tracking-wide text-muted">
        {{ WEEKDAYS_DE[weekdayIndex(selected)] }} · {{ parseIsoDate(selected).getDate() }}.
      </p>
      <div v-if="selectedWorkouts.length" class="mt-4 space-y-2">
        <RouterLink
          v-for="w in selectedWorkouts"
          :key="w.id"
          :to="{ name: 'workout', params: { id: w.id } }"
          class="flex items-center justify-between rounded-xl border border-line px-4 py-3 hover:border-ink/20"
        >
          <div>
            <SportBadge :sport="w.sport" />
            <p class="mt-1 font-semibold">{{ w.title }}</p>
            <p class="text-sm text-muted">{{ w.durationMin }} min</p>
          </div>
          <span class="text-muted">→</span>
        </RouterLink>
      </div>
      <p v-else class="mt-3 text-sm text-muted">Ruhetag.</p>
    </section>
  </main>
</template>
