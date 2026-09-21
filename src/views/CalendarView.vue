<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import SportBadge from '@/components/SportBadge.vue'
import { MONTHS_DE, WEEKDAYS_DE, addDays, isoDate, parseIsoDate, startOfWeekMonday, weekdayIndex } from '@/lib/format'
import { workoutsOn } from '@/lib/plan/generate'
import { useTrainerStore } from '@/stores/trainer'
import type { PlannedWorkout } from '@/lib/types'

const store = useTrainerStore()
const router = useRouter()
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
  <main class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <div class="flex items-end justify-between gap-4">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.25em] text-teal">Kalender</p>
        <h1 class="mt-2 font-display text-4xl">{{ monthLabel }}</h1>
      </div>
      <div class="flex gap-2">
        <button type="button" class="rounded-full border border-line bg-paper px-3 py-1.5 text-sm" @click="shiftMonth(-1)">←</button>
        <button type="button" class="rounded-full border border-line bg-paper px-3 py-1.5 text-sm" @click="shiftMonth(1)">→</button>
      </div>
    </div>

    <div class="mt-6 grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-wider text-ink-soft">
      <span v-for="d in WEEKDAYS_DE" :key="d">{{ d }}</span>
    </div>
    <div class="mt-2 grid grid-cols-7 gap-2">
      <button
        v-for="day in cells"
        :key="day"
        type="button"
        class="min-h-[92px] rounded-2xl border p-2 text-left transition"
        :class="[
          inMonth(day) ? 'bg-paper border-line' : 'bg-transparent border-transparent opacity-40',
          selected === day ? 'ring-2 ring-ink' : '',
          day === today ? 'border-coral' : '',
        ]"
        @click="selected = day"
      >
        <span class="text-sm font-semibold">{{ parseIsoDate(day).getDate() }}</span>
        <div class="mt-1 space-y-1">
          <span
            v-for="w in dayWorkouts(day)"
            :key="w.id"
            class="block truncate text-[11px] leading-tight text-ink-soft"
          >
            {{ w.title }}
          </span>
        </div>
      </button>
    </div>

    <section class="mt-8 rounded-3xl bg-paper p-5">
      <p class="text-xs uppercase tracking-wider text-ink-soft">{{ WEEKDAYS_DE[weekdayIndex(selected)] }} · {{ selected }}</p>
      <div v-if="selectedWorkouts.length" class="mt-4 space-y-3">
        <button
          v-for="w in selectedWorkouts"
          :key="w.id"
          type="button"
          class="flex w-full items-center justify-between rounded-2xl border border-line px-4 py-3 text-left hover:border-ink/30"
          @click="router.push({ name: 'workout', params: { id: w.id } })"
        >
          <div>
            <SportBadge :sport="w.sport" />
            <p class="mt-1 font-semibold">{{ w.title }}</p>
            <p class="text-sm text-ink-soft">{{ w.durationMin }} min · {{ w.phase }}</p>
          </div>
          <span>→</span>
        </button>
      </div>
      <p v-else class="mt-3 text-ink-soft">Ruhetag.</p>
    </section>
  </main>
</template>
