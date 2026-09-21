<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import IntervalChart from '@/components/IntervalChart.vue'
import SportBadge from '@/components/SportBadge.vue'
import WeekStrip from '@/components/WeekStrip.vue'
import { MONTHS_DE, WEEKDAYS_DE, addDays, isoDate, parseIsoDate, startOfWeekMonday, weekdayIndex } from '@/lib/format'
import { SPORT_DOT } from '@/lib/sport'
import { weekWorkouts, workoutsOn } from '@/lib/plan/generate'
import { useTrainerStore } from '@/stores/trainer'
import type { PlannedWorkout } from '@/lib/types'

const store = useTrainerStore()
const today = isoDate(new Date())
const cursor = ref(today)
const selected = ref(today)

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
const selectedWeek = computed(() => weekWorkouts(store.plan, selected.value))

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

function shortTitle(title: string) {
  return title.replace(/^(Dauerlauf |Rad |Schwimm-?|Easy \+ )/, '')
}
</script>

<template>
  <main class="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight">Kalender</h1>
        <p class="mt-1 text-sm text-muted">Woche zuerst — so siehst du, was wirklich ansteht.</p>
      </div>
      <div class="flex gap-2">
        <button type="button" class="rounded-lg border border-line bg-paper px-3 py-1.5 text-sm" @click="shiftMonth(-1)">←</button>
        <button type="button" class="rounded-lg border border-line bg-paper px-3 py-1.5 text-sm" @click="cursor = today; selected = today">Heute</button>
        <button type="button" class="rounded-lg border border-line bg-paper px-3 py-1.5 text-sm" @click="shiftMonth(1)">→</button>
      </div>
    </div>

    <section class="mt-6">
      <h2 class="text-lg font-semibold">{{ monthLabel }} · gewählte Woche</h2>
      <div class="mt-3">
        <WeekStrip :start="selected" />
      </div>
    </section>

    <section class="mt-6 grid gap-3 lg:grid-cols-2">
      <article
        v-for="w in selectedWeek"
        :key="w.id"
        class="rounded-2xl border border-line bg-paper p-4"
        :class="w.date === selected ? 'ring-1 ring-ink/20' : ''"
      >
        <RouterLink :to="{ name: 'workout', params: { id: w.id } }" class="block">
          <p class="text-[11px] font-semibold uppercase tracking-wide text-muted">
            {{ WEEKDAYS_DE[weekdayIndex(w.date)] }} · {{ parseIsoDate(w.date).getDate() }}. · {{ w.durationMin }} min
          </p>
          <div class="mt-1 flex items-center gap-2">
            <SportBadge :sport="w.sport" />
            <h3 class="font-semibold">{{ w.title }}</h3>
          </div>
          <p class="mt-2 line-clamp-2 text-sm text-muted">{{ w.description }}</p>
          <div class="mt-3">
            <IntervalChart :workout="w" compact />
          </div>
        </RouterLink>
      </article>
      <p v-if="!selectedWeek.length" class="text-sm text-muted">In dieser Woche steht nichts im Plan.</p>
    </section>

    <div class="mt-8 overflow-x-auto">
      <p class="mb-3 text-sm font-semibold">Monat</p>
      <div class="grid min-w-[720px] grid-cols-7 gap-px rounded-2xl border border-line bg-line">
        <div v-for="d in WEEKDAYS_DE" :key="d" class="bg-paper py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted">
          {{ d }}
        </div>
        <button
          v-for="day in cells"
          :key="day"
          type="button"
          class="min-h-[96px] bg-paper p-2 text-left transition hover:bg-sand"
          :class="[
            inMonth(day) ? '' : 'opacity-35',
            selected === day ? 'bg-sand' : '',
            day === today ? 'ring-1 ring-inset ring-ink' : '',
          ]"
          @click="selected = day"
        >
          <span class="text-sm font-semibold tabular-nums">{{ parseIsoDate(day).getDate() }}</span>
          <div class="mt-1 space-y-1">
            <p v-for="w in dayWorkouts(day)" :key="w.id" class="truncate text-[11px] leading-tight">
              <span class="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle" :class="SPORT_DOT[w.sport]" />
              {{ shortTitle(w.title) }}
            </p>
          </div>
        </button>
      </div>
    </div>

    <section class="mt-6 rounded-2xl border border-line bg-paper p-5 lg:hidden">
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
