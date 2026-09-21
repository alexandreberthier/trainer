<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { WEEKDAYS_DE } from '@/lib/format'
import { isStravaConfigured, stravaAuthorizeUrl } from '@/lib/strava'
import type { RaceDistance } from '@/lib/types'
import { useTrainerStore } from '@/stores/trainer'

const store = useTrainerStore()
const router = useRouter()
const step = ref(0)
const error = ref<string | null>(null)

const form = reactive({
  displayName: store.profile.displayName || '',
  raceType: store.profile.raceType as RaceDistance,
  raceDate: store.profile.raceDate,
  raceName: store.profile.raceName,
  weeklyHoursTarget: store.profile.weeklyHoursTarget,
  availableDays: [...store.profile.availableDays],
})

const races: Array<{ id: RaceDistance; title: string; detail: string }> = [
  { id: 'sprint', title: 'Sprint', detail: '750 m · 20 km · 5 km' },
  { id: 'olympic', title: 'Olympic', detail: '1,5 km · 40 km · 10 km' },
  { id: 'half', title: '70.3', detail: '1,9 km · 90 km · 21,1 km' },
  { id: 'ironman', title: 'Ironman', detail: '3,8 km · 180 km · 42,2 km' },
]

const stravaReady = isStravaConfigured()

function toggleDay(day: number) {
  const i = form.availableDays.indexOf(day)
  if (i >= 0) form.availableDays.splice(i, 1)
  else form.availableDays.push(day)
  form.availableDays.sort()
}

function finish(useDemo: boolean) {
  error.value = null
  if (form.availableDays.length < 4) {
    error.value = 'Bitte mindestens vier Trainingstage wählen.'
    return
  }
  store.completeOnboarding({ ...form, useDemo })
  router.push({ name: 'today' })
}

function connectStrava() {
  if (form.availableDays.length < 4) {
    error.value = 'Bitte mindestens vier Trainingstage wählen.'
    return
  }
  store.completeOnboarding({ ...form, useDemo: true })
  window.location.href = stravaAuthorizeUrl()
}

const canNext = computed(() => {
  if (step.value === 0) return true
  return Boolean(form.raceDate)
})
</script>

<template>
  <main class="grain min-h-screen">
    <div class="mx-auto grid min-h-screen max-w-6xl gap-0 lg:grid-cols-[1.15fr_0.85fr]">
      <section class="flex flex-col justify-between px-6 py-8 sm:px-12 lg:px-16 lg:py-14">
        <p class="text-xs font-semibold uppercase tracking-[0.28em] text-teal">Trainer</p>

        <div v-if="step === 0" class="max-w-xl py-10">
          <p class="text-sm text-ink-soft">Triathlon-Planung aus deinen echten Zahlen</p>
          <h1 class="mt-3 font-display text-5xl leading-[1.05] sm:text-6xl">
            Erst die Schwelle,<br />dann der Kalender.
          </h1>
          <p class="mt-6 max-w-md text-base leading-relaxed text-ink-soft">
            Die App liest deine letzten Wochen (Strava oder Demo), rechnet Lauf-Paces, FTP und CSS und baut daraus
            einen periodisierten Plan — nicht aus einem Chat.
          </p>
          <button
            type="button"
            class="mt-10 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-sand transition hover:bg-teal-2"
            @click="step = 1"
          >
            Plan starten
          </button>
        </div>

        <div v-else class="max-w-xl py-8">
          <p class="text-sm text-ink-soft">Schritt {{ step }} von 2</p>
          <h1 class="mt-2 font-display text-4xl">{{ step === 1 ? 'Wettkampf & Zeit' : 'Trainingsdaten' }}</h1>

          <form v-if="step === 1" class="mt-8 space-y-6" @submit.prevent="step = 2">
            <label class="block">
              <span class="text-xs font-semibold uppercase tracking-wider text-ink-soft">Name</span>
              <input
                v-model="form.displayName"
                class="mt-1 w-full rounded-xl border border-line bg-paper px-4 py-3 outline-none focus:border-teal"
                placeholder="Alex"
              />
            </label>

            <div>
              <p class="text-xs font-semibold uppercase tracking-wider text-ink-soft">Distanz</p>
              <div class="mt-2 grid grid-cols-2 gap-2">
                <button
                  v-for="race in races"
                  :key="race.id"
                  type="button"
                  class="rounded-2xl border px-4 py-3 text-left transition"
                  :class="form.raceType === race.id ? 'border-ink bg-ink text-sand' : 'border-line bg-paper hover:border-ink/30'"
                  @click="form.raceType = race.id"
                >
                  <span class="block font-semibold">{{ race.title }}</span>
                  <span class="text-xs opacity-70">{{ race.detail }}</span>
                </button>
              </div>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <label class="block">
                <span class="text-xs font-semibold uppercase tracking-wider text-ink-soft">Wettkampftag</span>
                <input v-model="form.raceDate" type="date" class="mt-1 w-full rounded-xl border border-line bg-paper px-4 py-3 outline-none focus:border-teal" />
              </label>
              <label class="block">
                <span class="text-xs font-semibold uppercase tracking-wider text-ink-soft">Stunden / Woche</span>
                <input
                  v-model.number="form.weeklyHoursTarget"
                  type="number"
                  min="3"
                  max="20"
                  step="0.5"
                  class="mt-1 w-full rounded-xl border border-line bg-paper px-4 py-3 outline-none focus:border-teal"
                />
              </label>
            </div>

            <label class="block">
              <span class="text-xs font-semibold uppercase tracking-wider text-ink-soft">Wettkampf (optional)</span>
              <input v-model="form.raceName" class="mt-1 w-full rounded-xl border border-line bg-paper px-4 py-3 outline-none focus:border-teal" placeholder="z. B. Challenge Roth" />
            </label>

            <div>
              <p class="text-xs font-semibold uppercase tracking-wider text-ink-soft">Verfügbare Tage</p>
              <div class="mt-2 flex flex-wrap gap-2">
                <button
                  v-for="(label, i) in WEEKDAYS_DE"
                  :key="label"
                  type="button"
                  class="h-10 w-10 rounded-full text-sm font-semibold"
                  :class="form.availableDays.includes(i) ? 'bg-teal text-sand' : 'bg-sand-2 text-ink-soft'"
                  @click="toggleDay(i)"
                >
                  {{ label }}
                </button>
              </div>
            </div>

            <button
              type="submit"
              class="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-sand disabled:opacity-40"
              :disabled="!canNext"
            >
              Weiter
            </button>
          </form>

          <div v-else class="mt-8 space-y-4">
            <p class="leading-relaxed text-ink-soft">
              Strava liefert Bestzeiten, Watt und Schwimm-Laps. Ohne Keys startest du mit realistischen Beispieldaten
              und siehst Plan plus Paces sofort.
            </p>
            <button
              v-if="stravaReady"
              type="button"
              class="flex w-full items-center justify-between rounded-2xl bg-coral px-5 py-4 text-left text-paper"
              @click="connectStrava"
            >
              <span>
                <strong class="block">Mit Strava verbinden</strong>
                <span class="text-sm opacity-80">Letzte 12 Wochen analysieren</span>
              </span>
              <span>→</span>
            </button>
            <button
              type="button"
              class="flex w-full items-center justify-between rounded-2xl border border-line bg-paper px-5 py-4 text-left"
              @click="finish(true)"
            >
              <span>
                <strong class="block">Demo starten</strong>
                <span class="text-sm text-ink-soft">Beispieldaten eines Olympic-Athleten</span>
              </span>
              <span>→</span>
            </button>
            <p v-if="!stravaReady" class="text-sm text-ink-soft">
              Strava-Keys fehlen in <code class="rounded bg-sand-2 px-1">.env</code> — Demo funktioniert trotzdem.
            </p>
            <p v-if="error" class="text-sm text-coral">{{ error }}</p>
            <button type="button" class="text-sm text-ink-soft underline" @click="step = 1">Zurück</button>
          </div>
        </div>

        <p class="text-xs text-ink-soft">Vue · Vercel · Strava</p>
      </section>

      <aside class="relative hidden overflow-hidden bg-teal-2 text-sand lg:block">
        <div class="absolute inset-0 grain opacity-30" />
        <div class="relative flex h-full flex-col justify-end p-12">
          <p class="text-sm uppercase tracking-[0.25em] text-gold">Methode</p>
          <ol class="mt-6 space-y-5 font-display text-3xl leading-tight">
            <li>1 · Bestleistungen, nicht Durchschnitt</li>
            <li>2 · VDOT, FTP, CSS</li>
            <li>3 · Base → Build → Peak → Taper</li>
          </ol>
        </div>
      </aside>
    </div>
  </main>
</template>
