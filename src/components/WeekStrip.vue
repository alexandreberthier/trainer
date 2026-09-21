<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { WEEKDAYS_DE, addDays, isoDate, parseIsoDate, startOfWeekMonday } from '@/lib/format'
import { SPORT_DOT } from '@/lib/sport'
import { workoutsOn } from '@/lib/plan/generate'
import { useTrainerStore } from '@/stores/trainer'

const store = useTrainerStore()
const router = useRouter()
const today = isoDate(new Date())
const start = startOfWeekMonday(today)
const days = computed(() => Array.from({ length: 7 }, (_, i) => addDays(start, i)))

function openDay(iso: string) {
  const items = workoutsOn(store.plan, iso)
  if (items[0]) router.push({ name: 'workout', params: { id: items[0].id } })
  else router.push({ name: 'calendar' })
}
</script>

<template>
  <div class="grid grid-cols-7 gap-1.5">
    <button
      v-for="(day, i) in days"
      :key="day"
      type="button"
      class="rounded-xl border px-1 py-2 text-center transition hover:border-ink/20"
      :class="day === today ? 'border-strava bg-paper' : 'border-line/80 bg-paper'"
      @click="openDay(day)"
    >
      <p class="text-[10px] font-semibold uppercase tracking-wide text-muted">{{ WEEKDAYS_DE[i] }}</p>
      <p class="mt-0.5 text-sm font-semibold">{{ parseIsoDate(day).getDate() }}</p>
      <div class="mt-1.5 flex min-h-2 justify-center gap-0.5">
        <span
          v-for="w in workoutsOn(store.plan, day)"
          :key="w.id"
          class="h-1.5 w-1.5 rounded-full"
          :class="SPORT_DOT[w.sport]"
        />
      </div>
    </button>
  </div>
</template>
