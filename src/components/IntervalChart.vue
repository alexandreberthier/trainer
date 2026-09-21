<script setup lang="ts">
import { computed } from 'vue'
import { INTENSITY_BAR, INTENSITY_HEIGHT, INTENSITY_LABEL } from '@/lib/sport'
import { workoutSegments } from '@/lib/workout-graph'
import type { PlannedWorkout } from '@/lib/types'

const props = withDefaults(
  defineProps<{
    workout: PlannedWorkout
    compact?: boolean
  }>(),
  { compact: false },
)

const segments = computed(() => workoutSegments(props.workout))
const total = computed(() => segments.value.reduce((sum, s) => sum + s.durationMin, 0) || 1)
const used = computed(() => [...new Set(segments.value.map((s) => s.intensity))])
</script>

<template>
  <div v-if="segments.length" :class="compact ? '' : 'space-y-2'">
    <div
      class="flex items-end gap-0.5 overflow-hidden rounded-lg bg-sand"
      :class="compact ? 'h-12 px-1 py-1' : 'h-[4.5rem] px-1.5 py-1.5'"
      role="img"
      :aria-label="`${workout.title}: ${workout.durationMin} Minuten`"
    >
      <div
        v-for="(seg, i) in segments"
        :key="i"
        class="min-w-[3px] rounded-sm"
        :class="[INTENSITY_BAR[seg.intensity], INTENSITY_HEIGHT[seg.intensity]]"
        :style="{ flexGrow: Math.max(seg.durationMin, 0.6) }"
        :title="`${seg.label} · ${Math.round(seg.durationMin * 10) / 10} min · ${seg.target}`"
      />
    </div>
    <div v-if="!compact" class="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
      <span v-for="key in used" :key="key" class="inline-flex items-center gap-1.5">
        <span class="h-2 w-2 rounded-sm" :class="INTENSITY_BAR[key]" />
        {{ INTENSITY_LABEL[key] }}
      </span>
      <span class="tabular-nums">{{ Math.round(total) }} min gesamt</span>
    </div>
  </div>
</template>
