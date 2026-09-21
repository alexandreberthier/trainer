<script setup lang="ts">
import { formatDuration, formatPace, formatPaceRange, formatWatts } from '@/lib/format'
import { useTrainerStore } from '@/stores/trainer'
import type { Confidence } from '@/lib/types'

const store = useTrainerStore()

const confLabel: Record<Confidence, string> = {
  high: 'hohe Sicherheit',
  medium: 'brauchbar',
  low: 'unsicher',
  none: 'fehlt',
}
</script>

<template>
  <main class="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
    <h1 class="text-3xl font-semibold tracking-tight">Paces & Schwellen</h1>
    <p class="mt-2 max-w-xl text-sm text-muted">
      Aus den letzten {{ store.fitness?.windowWeeks }} Wochen. Bestleistungen zählen, lockere Dauerläufe nicht als
      Schwelle.
    </p>

    <ul v-if="store.fitness?.warnings.length" class="mt-5 space-y-2">
      <li v-for="w in store.fitness.warnings" :key="w" class="rounded-xl bg-bike/10 px-4 py-2 text-sm">{{ w }}</li>
    </ul>
    <p v-if="store.error" class="mt-4 text-sm text-run">{{ store.error }}</p>

    <div class="mt-6 grid gap-4 lg:grid-cols-3">
      <article class="rounded-2xl border border-line bg-paper p-5">
        <p class="text-xs font-semibold uppercase tracking-wide text-run">Laufen</p>
        <p class="mt-2 text-3xl font-semibold tabular-nums">{{ formatPace(store.fitness?.run.thresholdPaceSecPerKm) }}</p>
        <p class="mt-1 text-sm text-muted">Schwelle · VDOT {{ store.fitness?.run.vdot ?? '—' }} · {{ confLabel[store.fitness?.run.confidence ?? 'none'] }}</p>
        <p class="mt-3 text-sm leading-relaxed text-muted">{{ store.fitness?.run.source }}</p>
        <ul class="mt-5 space-y-2 text-sm">
          <li v-for="z in store.fitness?.run.zones" :key="z.key" class="flex justify-between border-b border-line py-1.5">
            <span>{{ z.label }}</span>
            <span class="font-semibold tabular-nums">{{ z.paceSec ? formatPace(z.paceSec) : formatPaceRange(z.paceLowSec, z.paceHighSec) }}</span>
          </li>
        </ul>
        <ul class="mt-4 space-y-1 text-xs text-muted">
          <li v-for="e in store.fitness?.run.bestEfforts" :key="e.label + e.date">
            {{ e.label }} · {{ formatDuration(e.timeSec) }} · VDOT {{ e.vdot.toFixed(1) }}
          </li>
        </ul>
      </article>

      <article class="rounded-2xl border border-line bg-paper p-5">
        <p class="text-xs font-semibold uppercase tracking-wide text-bike">Rad</p>
        <p class="mt-2 text-3xl font-semibold tabular-nums">{{ formatWatts(store.fitness?.bike.ftpWatts) }}</p>
        <p class="mt-1 text-sm text-muted">FTP · {{ confLabel[store.fitness?.bike.confidence ?? 'none'] }}</p>
        <p class="mt-3 text-sm leading-relaxed text-muted">{{ store.fitness?.bike.source }}</p>
        <ul class="mt-5 space-y-2 text-sm">
          <li v-for="z in store.fitness?.bike.zones" :key="z.key" class="flex justify-between border-b border-line py-1.5">
            <span>{{ z.label }}</span>
            <span class="font-semibold tabular-nums">{{ z.wattsLow }}–{{ z.wattsHigh }} W</span>
          </li>
        </ul>
      </article>

      <article class="rounded-2xl border border-line bg-paper p-5">
        <p class="text-xs font-semibold uppercase tracking-wide text-swim">Schwimmen</p>
        <p class="mt-2 text-3xl font-semibold tabular-nums">{{ formatPace(store.fitness?.swim.cssSecPer100, '/100 m') }}</p>
        <p class="mt-1 text-sm text-muted">CSS · {{ confLabel[store.fitness?.swim.confidence ?? 'none'] }}</p>
        <p class="mt-3 text-sm leading-relaxed text-muted">{{ store.fitness?.swim.source }}</p>
        <ul class="mt-5 space-y-2 text-sm">
          <li v-for="z in store.fitness?.swim.zones" :key="z.key" class="flex justify-between border-b border-line py-1.5">
            <span>{{ z.label }}</span>
            <span class="font-semibold tabular-nums">
              {{ z.paceSec ? formatPace(z.paceSec, '/100 m') : formatPaceRange(z.paceLowSec, z.paceHighSec, '/100 m') }}
            </span>
          </li>
        </ul>
      </article>
    </div>

    <p class="mt-6 text-sm text-muted">
      Volumen: {{ store.fitness?.weeklyHoursBySport.swim }} h Schwimmen ·
      {{ store.fitness?.weeklyHoursBySport.bike }} h Rad ·
      {{ store.fitness?.weeklyHoursBySport.run }} h Laufen
    </p>
  </main>
</template>
