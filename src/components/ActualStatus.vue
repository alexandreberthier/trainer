<script setup lang="ts">
import { computed } from 'vue'
import { sessionActual } from '@/lib/plan/actual'
import type { Activity, PlannedWorkout } from '@/lib/types'

const props = defineProps<{
  workout: PlannedWorkout
  activities: Activity[]
}>()

const actual = computed(() => sessionActual(props.workout, props.activities))

const label: Record<string, string> = {
  done: 'Strava passt',
  short: 'Kürzer',
  long: 'Länger',
}
</script>

<template>
  <span
    v-if="actual.status !== 'missing'"
    class="text-[11px] font-semibold"
    :class="actual.status === 'done' ? 'text-swim' : 'text-run'"
  >
    {{ label[actual.status] }}
  </span>
</template>
