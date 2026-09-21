<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { WEEKDAYS_DE, addDays, isoDate, parseIsoDate, startOfWeekMonday } from '@/lib/format'
import { SPORT_DOT } from '@/lib/sport'
import { workoutsOn } from '@/lib/plan/generate'
import { sessionActual } from '@/lib/plan/actual'
import { useTrainerStore } from '@/stores/trainer'

const props = withDefaults(
  defineProps<{
    start?: string
    mode?: 'link' | 'select'
    selected?: string
    from?: string
  }>(),
  {
    mode: 'link',
    from: 'today',
  },
)

const emit = defineEmits<{
  select: [day: string]
}>()

const store = useTrainerStore()
const today = isoDate(new Date())
const weekStart = computed(() => startOfWeekMonday(props.start ?? today))
const days = computed(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart.value, i)))

function dayTo(day: string) {
  const first = workoutsOn(store.plan, day)[0]
  if (first) {
    return { name: 'workout', params: { id: first.id }, query: { from: props.from, day } }
  }
  return { name: 'calendar', query: { day } }
}

function isCurrent(day: string) {
  if (props.selected) return day === props.selected
  return day === today
}

function dayDone(day: string) {
  return workoutsOn(store.plan, day).some((workout) => sessionActual(workout, store.activities).status !== 'missing')
}
</script>

<template>
  <div class="grid grid-cols-2 gap-2 sm:grid-cols-7">
    <component
      :is="mode === 'select' ? 'button' : RouterLink"
      v-for="(day, i) in days"
      :key="day"
      v-bind="mode === 'select' ? { type: 'button' } : { to: dayTo(day) }"
      class="min-h-[88px] rounded-2xl border px-2.5 py-2 text-left transition hover:border-ink/20"
      :class="isCurrent(day) ? 'border-ink bg-paper shadow-sm' : 'border-line bg-paper'"
      @click="mode === 'select' ? emit('select', day) : undefined"
    >
      <div class="flex items-baseline justify-between gap-1">
        <p class="text-[11px] font-semibold uppercase tracking-wide text-muted">{{ WEEKDAYS_DE[i] }}</p>
        <p class="text-sm font-semibold tabular-nums">{{ parseIsoDate(day).getDate() }}</p>
      </div>
      <div v-if="workoutsOn(store.plan, day).length" class="mt-2 space-y-1">
        <p
          v-for="w in workoutsOn(store.plan, day)"
          :key="w.id"
          class="line-clamp-2 text-[12px] font-medium leading-tight"
        >
          <span class="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle" :class="SPORT_DOT[w.sport]" />
          {{ w.title.replace(/^(Dauerlauf |Rad |Schwimm-?)/, '') }}
        </p>
        <p class="text-[11px] tabular-nums text-muted">
          {{ workoutsOn(store.plan, day).reduce((s, w) => s + w.durationMin, 0) }} min
          <span v-if="dayDone(day)" class="ml-1 font-semibold text-swim">· ✓</span>
        </p>
      </div>
      <p v-else class="mt-3 text-[12px] text-muted">Ruhe</p>
    </component>
  </div>
</template>
