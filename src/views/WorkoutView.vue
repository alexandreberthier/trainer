<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SportBadge from '@/components/SportBadge.vue'
import { formatDateLong } from '@/lib/format'
import { useTrainerStore } from '@/stores/trainer'

const route = useRoute()
const router = useRouter()
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
  <main class="mx-auto max-w-3xl px-4 py-8 sm:px-6">
    <button type="button" class="text-sm text-ink-soft" @click="router.back()">← zurück</button>

    <article v-if="workout" class="mt-6">
      <SportBadge :sport="workout.sport" />
      <h1 class="mt-3 font-display text-4xl">{{ workout.title }}</h1>
      <p class="mt-2 text-ink-soft">
        {{ formatDateLong(workout.date) }} · {{ workout.durationMin }} min · {{ intensityLabel[workout.intensity] }} ·
        {{ workout.phase }}
      </p>
      <p class="mt-5 text-lg leading-relaxed">{{ workout.description }}</p>

      <ol class="mt-8 space-y-3">
        <li v-for="(block, i) in workout.structure" :key="block.id" class="rounded-2xl border border-line bg-paper p-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wider text-ink-soft">{{ i + 1 }}</p>
              <h2 class="font-display text-2xl">{{ block.label }}</h2>
            </div>
            <p class="text-sm text-ink-soft">{{ block.durationMin ? `${block.durationMin} min` : '' }}</p>
          </div>
          <p class="mt-2 text-sm">Ziel: {{ block.target }}</p>
          <ul v-if="block.steps?.length" class="mt-3 space-y-1 text-sm text-ink-soft">
            <li v-for="(step, si) in block.steps" :key="si">
              {{ block.repeats ? `${block.repeats}×` : '' }} {{ step.label }} — {{ step.target }}
            </li>
          </ul>
        </li>
      </ol>

      <p class="mt-8 rounded-2xl bg-sand-2 px-4 py-3 text-sm text-ink-soft">
        Export auf die Coros Pace 4 folgt über intervals.icu. Die Struktur steht — der Sync kommt als nächster Schritt.
      </p>
    </article>

    <p v-else class="mt-10 text-ink-soft">Einheit nicht gefunden.</p>
  </main>
</template>
