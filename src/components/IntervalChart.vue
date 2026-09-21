<script setup lang="ts">
import { computed } from 'vue'
import { formatMinutes } from '@/lib/format'
import { INTENSITY_BAR, INTENSITY_LABEL } from '@/lib/sport'
import { displayRows, structureTotal, workoutRecipe, workoutSegments } from '@/lib/workout-graph'
import type { PlannedWorkout } from '@/lib/types'

const props = withDefaults(
  defineProps<{
    workout: PlannedWorkout
    compact?: boolean
  }>(),
  { compact: false },
)

const rows = computed(() => displayRows(props.workout))
const segments = computed(() => workoutSegments(props.workout))
const total = computed(() => Math.round(structureTotal(props.workout) || props.workout.durationMin))
const recipe = computed(() => workoutRecipe(props.workout))
const longest = computed(() => Math.max(...rows.value.map((r) => r.durationMin), 1))

function barWidth(min: number, max: number) {
  return `${Math.max(8, (min / max) * 100)}%`
}
</script>

<template>
  <div v-if="rows.length">
    <div
      v-if="compact"
      class="space-y-1.5"
      :aria-label="recipe"
    >
      <div class="flex h-10 items-stretch gap-0.5 overflow-hidden rounded-lg bg-sand p-1">
        <div
          v-for="(seg, i) in segments"
          :key="i"
          class="min-w-[4px] rounded-sm"
          :class="INTENSITY_BAR[seg.intensity]"
          :style="{ flexGrow: Math.max(seg.durationMin, 0.5) }"
          :title="`${seg.label} · ${formatMinutes(seg.durationMin)} · ${seg.target}`"
        />
      </div>
      <p class="line-clamp-2 text-[11px] leading-snug text-muted">{{ recipe }}</p>
    </div>

    <div v-else class="space-y-3">
      <p class="text-xs font-semibold uppercase tracking-wide text-muted">
        Ablauf · {{ total }} min
      </p>

      <div class="space-y-2">
        <article
          v-for="(row, i) in rows"
          :key="i"
          class="overflow-hidden rounded-2xl border border-line bg-paper"
        >
          <div class="flex">
            <div class="w-1.5 shrink-0" :class="INTENSITY_BAR[row.intensity]" />
            <div class="min-w-0 flex-1 p-3.5">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-[11px] font-semibold uppercase tracking-wide text-muted">
                    {{ row.kind === 'repeat' ? `${row.repeats} Wiederholungen` : INTENSITY_LABEL[row.intensity] }}
                  </p>
                  <h3 class="mt-0.5 font-semibold">{{ row.label }}</h3>
                </div>
                <p class="shrink-0 text-sm font-semibold tabular-nums">{{ formatMinutes(row.durationMin) }}</p>
              </div>
              <p class="mt-1 text-sm text-muted">{{ row.target }}</p>

              <div
                class="mt-3 h-2.5 overflow-hidden rounded-full bg-sand"
                :title="formatMinutes(row.durationMin)"
              >
                <div
                  class="h-full rounded-full"
                  :class="INTENSITY_BAR[row.intensity]"
                  :style="{ width: barWidth(row.durationMin, longest) }"
                />
              </div>

              <div v-if="row.kind === 'repeat' && row.steps?.length" class="mt-3 space-y-2">
                <div class="flex h-12 items-stretch gap-0.5 overflow-hidden rounded-lg bg-sand p-1">
                  <template v-for="n in row.repeats" :key="n">
                    <div
                      v-for="(step, si) in row.steps"
                      :key="`${n}-${si}`"
                      class="min-w-[6px] rounded-sm"
                      :class="INTENSITY_BAR[step.intensity]"
                      :style="{ flexGrow: Math.max(step.durationMin, 0.6) }"
                    />
                  </template>
                </div>
                <div class="grid gap-1.5 sm:grid-cols-2">
                  <p
                    v-for="(step, si) in row.steps"
                    :key="si"
                    class="flex items-center justify-between gap-2 rounded-lg bg-sand px-2.5 py-1.5 text-sm"
                  >
                    <span>
                      <span class="mr-1.5 inline-block h-2 w-2 rounded-sm align-middle" :class="INTENSITY_BAR[step.intensity]" />
                      {{ step.label }}
                    </span>
                    <span class="tabular-nums text-muted">{{ formatMinutes(step.durationMin) }} · {{ step.target }}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>
