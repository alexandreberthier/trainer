<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import SportBadge from '@/components/SportBadge.vue'
import { formatDateLong } from '@/lib/format'
import { useTrainerStore } from '@/stores/trainer'

const route = useRoute()
const store = useTrainerStore()

const workout = computed(() => store.plan?.workouts.find((w) => w.id === route.params.id) ?? null)

const intensityLabel: Record<string, string> = {
  recovery: 'Erholung',
  easy: 'Easy',
  steady: 'Steady',
  threshold: 'Schwelle',
  vo2: 'VO2',
  race: 'Wettkampf',
  test: 'Test',
}
</script>

<template>
  <main class="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
    <RouterLink to="/app" class="text-sm text-muted hover:text-ink">← Heute</RouterLink>

    <article v-if="workout" class="mt-5">
      <SportBadge :sport="workout.sport" />
      <h1 class="mt-3 text-3xl font-semibold tracking-tight">{{ workout.title }}</h1>
      <p class="mt-2 text-sm text-muted">
        {{ formatDateLong(workout.date) }} · {{ workout.durationMin }} min · {{ intensityLabel[workout.intensity] }}
      </p>
      <p class="mt-4 leading-relaxed">{{ workout.description }}</p>

      <ol class="mt-6 space-y-2">
        <li v-for="(block, i) in workout.structure" :key="block.id" class="rounded-2xl border border-line bg-paper p-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-wide text-muted">Schritt {{ i + 1 }}</p>
              <h2 class="mt-1 text-lg font-semibold">{{ block.label }}</h2>
            </div>
            <p class="text-sm tabular-nums text-muted">{{ block.durationMin ? `${block.durationMin} min` : '' }}</p>
          </div>
          <p class="mt-2 text-sm">Ziel: {{ block.target }}</p>
          <ul v-if="block.steps?.length" class="mt-2 space-y-1 text-sm text-muted">
            <li v-for="(step, si) in block.steps" :key="si">
              {{ step.label }} — {{ step.target }}
            </li>
          </ul>
        </li>
      </ol>
    </article>

    <p v-else class="mt-10 text-muted">Einheit nicht gefunden.</p>
  </main>
</template>
