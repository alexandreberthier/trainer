<script setup lang="ts">
import { formatDuration, formatPace, formatPaceRange, formatWatts } from '@/lib/format'
import { isStravaConfigured, stravaAuthorizeUrl } from '@/lib/strava'
import { useTrainerStore } from '@/stores/trainer'
import type { Confidence } from '@/lib/types'

const store = useTrainerStore()

const confLabel: Record<Confidence, string> = {
  high: 'hohe Sicherheit',
  medium: 'brauchbar',
  low: 'unsicher',
  none: 'fehlt',
}

function connectOrSync() {
  if (!store.profile.stravaConnected) {
    window.location.href = stravaAuthorizeUrl()
    return
  }
  void resync()
}

async function resync() {
  store.loading = true
  try {
    const res = await fetch('/api/strava/sync')
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    store.setActivities(data.activities, true)
  } catch (e) {
    store.error = e instanceof Error ? e.message : 'Sync fehlgeschlagen'
  } finally {
    store.loading = false
  }
}
</script>

<template>
  <main class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.25em] text-teal">Analyse</p>
        <h1 class="mt-2 font-display text-4xl">Paces & Schwellen</h1>
        <p class="mt-2 max-w-xl text-ink-soft">
          Aus den letzten {{ store.fitness?.windowWeeks }} Wochen. Bestleistungen zählen, lockere Dauerläufe nicht als
          Schwelle.
        </p>
      </div>
      <div class="flex gap-2">
        <button
          v-if="isStravaConfigured()"
          type="button"
          class="rounded-full bg-coral px-4 py-2 text-sm font-semibold text-paper"
          @click="connectOrSync"
        >
          {{ store.profile.stravaConnected ? 'Strava aktualisieren' : 'Strava verbinden' }}
        </button>
      </div>
    </div>

    <ul v-if="store.fitness?.warnings.length" class="mt-6 space-y-2">
      <li v-for="w in store.fitness.warnings" :key="w" class="rounded-xl bg-gold/15 px-4 py-2 text-sm">{{ w }}</li>
    </ul>
    <p v-if="store.error" class="mt-4 text-sm text-coral">{{ store.error }}</p>

    <div class="mt-8 grid gap-4 lg:grid-cols-3">
      <article class="rounded-3xl bg-paper p-6">
        <p class="text-xs font-semibold uppercase tracking-wider text-coral">Laufen</p>
        <p class="mt-2 font-display text-4xl">{{ formatPace(store.fitness?.run.thresholdPaceSecPerKm) }}</p>
        <p class="mt-1 text-sm text-ink-soft">Schwelle · VDOT {{ store.fitness?.run.vdot ?? '—' }} · {{ confLabel[store.fitness?.run.confidence ?? 'none'] }}</p>
        <p class="mt-3 text-sm leading-relaxed text-ink-soft">{{ store.fitness?.run.source }}</p>
        <ul class="mt-5 space-y-2 text-sm">
          <li v-for="z in store.fitness?.run.zones" :key="z.key" class="flex justify-between border-b border-line/70 py-1.5">
            <span>{{ z.label }}</span>
            <span class="font-semibold">{{ z.paceSec ? formatPace(z.paceSec) : formatPaceRange(z.paceLowSec, z.paceHighSec) }}</span>
          </li>
        </ul>
        <ul class="mt-5 space-y-1 text-xs text-ink-soft">
          <li v-for="e in store.fitness?.run.bestEfforts" :key="e.label + e.date">
            {{ e.label }} · {{ formatDuration(e.timeSec) }} · VDOT {{ e.vdot.toFixed(1) }}
          </li>
        </ul>
      </article>

      <article class="rounded-3xl bg-paper p-6">
        <p class="text-xs font-semibold uppercase tracking-wider text-gold">Rad</p>
        <p class="mt-2 font-display text-4xl">{{ formatWatts(store.fitness?.bike.ftpWatts) }}</p>
        <p class="mt-1 text-sm text-ink-soft">FTP · {{ confLabel[store.fitness?.bike.confidence ?? 'none'] }}</p>
        <p class="mt-3 text-sm leading-relaxed text-ink-soft">{{ store.fitness?.bike.source }}</p>
        <ul class="mt-5 space-y-2 text-sm">
          <li v-for="z in store.fitness?.bike.zones" :key="z.key" class="flex justify-between border-b border-line/70 py-1.5">
            <span>{{ z.label }}</span>
            <span class="font-semibold">{{ z.wattsLow }}–{{ z.wattsHigh }} W</span>
          </li>
        </ul>
      </article>

      <article class="rounded-3xl bg-paper p-6">
        <p class="text-xs font-semibold uppercase tracking-wider text-teal">Schwimmen</p>
        <p class="mt-2 font-display text-4xl">{{ formatPace(store.fitness?.swim.cssSecPer100, '/100 m') }}</p>
        <p class="mt-1 text-sm text-ink-soft">CSS · {{ confLabel[store.fitness?.swim.confidence ?? 'none'] }}</p>
        <p class="mt-3 text-sm leading-relaxed text-ink-soft">{{ store.fitness?.swim.source }}</p>
        <ul class="mt-5 space-y-2 text-sm">
          <li v-for="z in store.fitness?.swim.zones" :key="z.key" class="flex justify-between border-b border-line/70 py-1.5">
            <span>{{ z.label }}</span>
            <span class="font-semibold">
              {{ z.paceSec ? formatPace(z.paceSec, '/100 m') : formatPaceRange(z.paceLowSec, z.paceHighSec, '/100 m') }}
            </span>
          </li>
        </ul>
      </article>
    </div>

    <p class="mt-8 text-sm text-ink-soft">
      Volumen zuletzt: {{ store.fitness?.weeklyHoursBySport.swim }} h Schwimmen ·
      {{ store.fitness?.weeklyHoursBySport.bike }} h Rad ·
      {{ store.fitness?.weeklyHoursBySport.run }} h Laufen
    </p>
  </main>
</template>
