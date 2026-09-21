<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { formatDuration, formatPace, formatPaceRange, formatWatts } from '@/lib/format'
import { useTrainerStore } from '@/stores/trainer'
import type { Confidence, TrainableSport } from '@/lib/types'

const store = useTrainerStore()

const confLabel: Record<Confidence, string> = {
  high: 'hohe Sicherheit',
  medium: 'brauchbar',
  low: 'unsicher',
  none: 'fehlt',
}

const sportOptions: Array<{ id: TrainableSport; label: string; hint: string }> = [
  { id: 'swim', label: 'Schwimmen', hint: 'CSS-Intervalle und Technik' },
  { id: 'bike', label: 'Rad', hint: 'Ausdauer, Schwelle, VO2' },
  { id: 'run', label: 'Laufen', hint: 'Easy, Intervalle, langer Lauf' },
  { id: 'strength', label: 'Kraft', hint: 'optional, einmal pro Woche' },
]

const ftpInput = ref<number | null>(store.profile.ftpWattsOverride ?? store.fitness?.bike.ftpWatts ?? null)
const runInput = ref<number | null>(store.profile.runThresholdSecOverride ?? store.fitness?.run.thresholdPaceSecPerKm ?? null)
const cssInput = ref<number | null>(store.profile.cssSecPer100Override ?? store.fitness?.swim.cssSecPer100 ?? null)
const runPaceText = computed({
  get() {
    const s = runInput.value
    if (s == null) return ''
    const m = Math.floor(s / 60)
    const sec = Math.round(s % 60)
    return `${m}:${String(sec).padStart(2, '0')}`
  },
  set(value: string) {
    const match = value.trim().match(/^(\d{1,2}):(\d{2})$/)
    if (!match) return
    runInput.value = Number(match[1]) * 60 + Number(match[2])
  },
})
const cssPaceText = computed({
  get() {
    const s = cssInput.value
    if (s == null) return ''
    const m = Math.floor(s / 60)
    const sec = Math.round(s % 60)
    return `${m}:${String(sec).padStart(2, '0')}`
  },
  set(value: string) {
    const match = value.trim().match(/^(\d{1,2}):(\d{2})$/)
    if (!match) return
    cssInput.value = Number(match[1]) * 60 + Number(match[2])
  },
})

watch(
  () => store.fitness,
  (next) => {
    if (store.profile.ftpWattsOverride == null) ftpInput.value = next?.bike.ftpWatts ?? null
    if (store.profile.runThresholdSecOverride == null) runInput.value = next?.run.thresholdPaceSecPerKm ?? null
    if (store.profile.cssSecPer100Override == null) cssInput.value = next?.swim.cssSecPer100 ?? null
  },
)

function applyNumbers() {
  store.updateProfile({
    ftpWattsOverride: ftpInput.value && ftpInput.value > 50 ? Math.round(ftpInput.value) : null,
    runThresholdSecOverride: runInput.value && runInput.value > 150 ? Math.round(runInput.value) : null,
    cssSecPer100Override: cssInput.value && cssInput.value > 50 ? Math.round(cssInput.value) : null,
  })
}

function clearOverride(key: 'ftpWattsOverride' | 'runThresholdSecOverride' | 'cssSecPer100Override') {
  store.updateProfile({ [key]: null })
}

const sports = computed(() => store.profile.enabledSports)
</script>

<template>
  <main class="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
    <h1 class="text-3xl font-semibold tracking-tight">Werte & Plan</h1>
    <p class="mt-2 max-w-xl text-sm text-muted">
      Zahlen aus Strava, falls nötig von dir korrigiert. Sportarten, die du weglässt, kommen nicht in den Kalender.
    </p>

    <section class="mt-6 rounded-2xl border border-line bg-paper p-5">
      <h2 class="text-lg font-semibold">Was soll im Plan stehen?</h2>
      <p class="mt-1 text-sm text-muted">Zum Beispiel nur Laufen — oder Schwimmen erstmal aus.</p>
      <div class="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <button
          v-for="opt in sportOptions"
          :key="opt.id"
          type="button"
          class="rounded-xl border px-4 py-3 text-left transition"
          :class="sports.includes(opt.id) ? 'border-ink bg-ink text-paper' : 'border-line bg-paper hover:border-ink/30'"
          @click="store.toggleSport(opt.id)"
        >
          <span class="block font-semibold">{{ opt.label }}</span>
          <span class="text-[12px] opacity-70">{{ opt.hint }}</span>
        </button>
      </div>
    </section>

    <ul v-if="store.fitness?.warnings.length" class="mt-5 space-y-2">
      <li v-for="w in store.fitness.warnings" :key="w" class="rounded-xl bg-bike/10 px-4 py-2 text-sm">{{ w }}</li>
    </ul>
    <p v-if="store.error" class="mt-4 text-sm text-run">{{ store.error }}</p>

    <div class="mt-6 grid gap-4 lg:grid-cols-3">
      <article v-if="sports.includes('run')" class="rounded-2xl border border-line bg-paper p-5">
        <p class="text-xs font-semibold uppercase tracking-wide text-run">Laufen</p>
        <p class="mt-2 text-3xl font-semibold tabular-nums">{{ formatPace(store.fitness?.run.thresholdPaceSecPerKm) }}</p>
        <p class="mt-1 text-sm text-muted">Schwelle · VDOT {{ store.fitness?.run.vdot ?? '—' }} · {{ confLabel[store.fitness?.run.confidence ?? 'none'] }}</p>
        <p class="mt-3 text-sm leading-relaxed text-muted">{{ store.fitness?.run.source }}</p>
        <label class="mt-4 block text-xs font-semibold uppercase tracking-wide text-muted">
          Schwelle anpassen (m:ss /km)
          <input
            v-model="runPaceText"
            class="mt-1.5 w-full rounded-xl border border-line bg-sand px-3 py-2 text-sm tabular-nums outline-none focus:border-ink"
            placeholder="5:20"
          />
        </label>
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

      <article v-if="sports.includes('bike')" class="rounded-2xl border border-line bg-paper p-5">
        <p class="text-xs font-semibold uppercase tracking-wide text-bike">Rad</p>
        <p class="mt-2 text-3xl font-semibold tabular-nums">{{ formatWatts(store.fitness?.bike.ftpWatts) }}</p>
        <p class="mt-1 text-sm text-muted">FTP im Plan · {{ confLabel[store.fitness?.bike.confidence ?? 'none'] }}</p>
        <p class="mt-3 text-sm leading-relaxed text-muted">{{ store.fitness?.bike.source }}</p>
        <dl class="mt-3 grid grid-cols-2 gap-2 text-xs text-muted">
          <div>
            <dt>Strava-Profil</dt>
            <dd class="font-semibold text-ink">{{ formatWatts(store.fitness?.bike.stravaFtpWatts) }}</dd>
          </div>
          <div>
            <dt>Aus Fahrten geschätzt</dt>
            <dd class="font-semibold text-ink">{{ formatWatts(store.fitness?.bike.estimatedFtpWatts) }}</dd>
          </div>
        </dl>
        <label class="mt-4 block text-xs font-semibold uppercase tracking-wide text-muted">
          FTP überschreiben (Watt)
          <input
            v-model.number="ftpInput"
            type="number"
            min="80"
            max="500"
            class="mt-1.5 w-full rounded-xl border border-line bg-sand px-3 py-2 text-sm tabular-nums outline-none focus:border-ink"
          />
        </label>
        <button v-if="store.profile.ftpWattsOverride" type="button" class="mt-2 text-xs text-muted hover:text-ink" @click="clearOverride('ftpWattsOverride')">
          Zurück zu Strava / Schätzung
        </button>
        <ul class="mt-5 space-y-2 text-sm">
          <li v-for="z in store.fitness?.bike.zones" :key="z.key" class="flex justify-between border-b border-line py-1.5">
            <span>{{ z.label }}</span>
            <span class="font-semibold tabular-nums">{{ z.wattsLow }}–{{ z.wattsHigh }} W</span>
          </li>
        </ul>
      </article>

      <article v-if="sports.includes('swim')" class="rounded-2xl border border-line bg-paper p-5">
        <p class="text-xs font-semibold uppercase tracking-wide text-swim">Schwimmen</p>
        <p class="mt-2 text-3xl font-semibold tabular-nums">{{ formatPace(store.fitness?.swim.cssSecPer100, '/100 m') }}</p>
        <p class="mt-1 text-sm text-muted">CSS · {{ confLabel[store.fitness?.swim.confidence ?? 'none'] }}</p>
        <p class="mt-3 text-sm leading-relaxed text-muted">{{ store.fitness?.swim.source }}</p>
        <label class="mt-4 block text-xs font-semibold uppercase tracking-wide text-muted">
          CSS anpassen (m:ss /100 m)
          <input
            v-model="cssPaceText"
            class="mt-1.5 w-full rounded-xl border border-line bg-sand px-3 py-2 text-sm tabular-nums outline-none focus:border-ink"
            placeholder="1:45"
          />
        </label>
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

    <div class="mt-6 flex flex-wrap items-center gap-3">
      <button type="button" class="rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-paper" @click="applyNumbers">
        Werte speichern und Plan neu bauen
      </button>
      <p class="text-sm text-muted">
        Volumen: {{ store.fitness?.weeklyHoursBySport.swim }} h Schwimmen ·
        {{ store.fitness?.weeklyHoursBySport.bike }} h Rad ·
        {{ store.fitness?.weeklyHoursBySport.run }} h Laufen
      </p>
    </div>
  </main>
</template>
