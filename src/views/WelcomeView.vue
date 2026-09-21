<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { WEEKDAYS_DE } from '@/lib/format'
import { isStravaConfigured, stravaAuthorizeUrl } from '@/lib/strava'
import type { RaceDistance } from '@/lib/types'
import { useTrainerStore } from '@/stores/trainer'

const store = useTrainerStore()
const router = useRouter()
const error = ref<string | null>(null)
const showSetup = ref(false)

const form = reactive({
  displayName: store.profile.displayName || '',
  raceType: store.profile.raceType as RaceDistance,
  raceDate: store.profile.raceDate,
  raceName: store.profile.raceName,
  weeklyHoursTarget: store.profile.weeklyHoursTarget,
  availableDays: [...store.profile.availableDays],
})

const races: Array<{ id: RaceDistance; title: string; detail: string }> = [
  { id: 'sprint', title: 'Sprint', detail: '750 · 20 · 5' },
  { id: 'olympic', title: 'Olympic', detail: '1,5 · 40 · 10' },
  { id: 'half', title: '70.3', detail: '1,9 · 90 · 21,1' },
  { id: 'ironman', title: 'Ironman', detail: '3,8 · 180 · 42,2' },
]

function toggleDay(day: number) {
  const i = form.availableDays.indexOf(day)
  if (i >= 0) form.availableDays.splice(i, 1)
  else form.availableDays.push(day)
  form.availableDays.sort()
}

function valid(): boolean {
  error.value = null
  if (form.availableDays.length < 4) {
    error.value = 'Bitte mindestens vier Trainingstage wählen.'
    return false
  }
  if (!form.raceDate) {
    error.value = 'Bitte ein Wettkampfdatum setzen.'
    return false
  }
  return true
}

function finishDemo() {
  if (!valid()) return
  store.completeOnboarding({ ...form, useDemo: true })
  router.push({ name: 'today' })
}

function connectStrava() {
  if (!valid()) return
  store.completeOnboarding({ ...form, useDemo: true })
  if (!isStravaConfigured()) {
    showSetup.value = true
    return
  }
  window.location.href = stravaAuthorizeUrl()
}
</script>

<template>
  <main class="min-h-screen bg-sand">
    <div class="mx-auto grid min-h-screen max-w-6xl lg:grid-cols-2">
      <section class="flex flex-col px-5 py-8 sm:px-10 lg:px-14 lg:py-12">
        <p class="text-sm font-semibold tracking-tight">Trainer</p>
        <h1 class="mt-8 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
          Trainingsplan aus deinen Strava-Daten.
        </h1>
        <p class="mt-4 max-w-md text-muted">
          Schwellenpaces aus echten Bestleistungen, dann ein Kalender für Schwimmen, Rad und Laufen — Tag für Tag.
        </p>

        <form class="mt-10 space-y-6" @submit.prevent="connectStrava">
          <label class="block">
            <span class="text-xs font-semibold uppercase tracking-wider text-muted">Name</span>
            <input
              v-model="form.displayName"
              class="mt-1.5 w-full rounded-xl border border-line bg-paper px-4 py-3 outline-none focus:border-ink"
              placeholder="Alex"
            />
          </label>

          <div>
            <p class="text-xs font-semibold uppercase tracking-wider text-muted">Distanz</p>
            <div class="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button
                v-for="race in races"
                :key="race.id"
                type="button"
                class="rounded-xl border px-3 py-2.5 text-left text-sm transition"
                :class="form.raceType === race.id ? 'border-ink bg-ink text-paper' : 'border-line bg-paper hover:border-ink/30'"
                @click="form.raceType = race.id"
              >
                <span class="block font-semibold">{{ race.title }}</span>
                <span class="text-[11px] opacity-70">{{ race.detail }}</span>
              </button>
            </div>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <label class="block">
              <span class="text-xs font-semibold uppercase tracking-wider text-muted">Wettkampf</span>
              <input v-model="form.raceDate" type="date" class="mt-1.5 w-full rounded-xl border border-line bg-paper px-4 py-3 outline-none focus:border-ink" />
            </label>
            <label class="block">
              <span class="text-xs font-semibold uppercase tracking-wider text-muted">Stunden / Woche</span>
              <input
                v-model.number="form.weeklyHoursTarget"
                type="number"
                min="3"
                max="20"
                step="0.5"
                class="mt-1.5 w-full rounded-xl border border-line bg-paper px-4 py-3 outline-none focus:border-ink"
              />
            </label>
          </div>

          <label class="block">
            <span class="text-xs font-semibold uppercase tracking-wider text-muted">Name des Wettkampfs</span>
            <input v-model="form.raceName" class="mt-1.5 w-full rounded-xl border border-line bg-paper px-4 py-3 outline-none focus:border-ink" placeholder="optional" />
          </label>

          <div>
            <p class="text-xs font-semibold uppercase tracking-wider text-muted">Trainingstage</p>
            <div class="mt-2 flex flex-wrap gap-2">
              <button
                v-for="(label, i) in WEEKDAYS_DE"
                :key="label"
                type="button"
                class="h-10 w-10 rounded-full text-sm font-semibold"
                :class="form.availableDays.includes(i) ? 'bg-ink text-paper' : 'bg-paper text-muted ring-1 ring-line'"
                @click="toggleDay(i)"
              >
                {{ label }}
              </button>
            </div>
          </div>

          <p v-if="error" class="text-sm text-run">{{ error }}</p>

          <div class="space-y-3 pt-2">
            <button
              type="submit"
              class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-strava px-5 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-strava-2"
            >
              <svg class="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M15.39 17.94 13.3 13.83H10.24L15.39 24l5.15-10.17h-3.07m-7.01-5.6 2.92 5.85h3.06L9.28 0 4.22 10.17h3.07" />
              </svg>
              Mit Strava verbinden
            </button>
            <button type="button" class="w-full rounded-xl border border-line bg-paper px-5 py-3 text-sm font-semibold hover:border-ink/20" @click="finishDemo">
              Erstmal mit Demo starten
            </button>
            <p class="text-center text-xs text-muted">Strava liefert die echten Paces. Demo zeigt den Plan sofort.</p>
          </div>
        </form>
      </section>

      <aside class="relative hidden bg-ink text-paper lg:flex lg:flex-col lg:justify-between lg:p-14">
        <p class="text-sm text-white/50">So entsteht der Plan</p>
        <ol class="space-y-8 text-2xl font-semibold leading-snug">
          <li><span class="text-strava">01</span><br />Strava-Bestleistungen der letzten 12 Wochen</li>
          <li><span class="text-strava">02</span><br />Schwelle, FTP und CSS rechnen</li>
          <li><span class="text-strava">03</span><br />Kalender: Base, Build, Peak, Taper</li>
        </ol>
        <p class="text-sm text-white/40">Keine KI-Intervalle — feste Trainingsregeln, deine Zahlen.</p>
      </aside>
    </div>

    <div v-if="showSetup" class="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center" @click.self="showSetup = false">
      <div class="w-full max-w-md rounded-2xl bg-paper p-6 shadow-xl">
        <h2 class="text-lg font-semibold">Strava einrichten</h2>
        <p class="mt-2 text-sm leading-relaxed text-muted">
          Der Plan ist gespeichert. Für echte Daten trag Client ID und Secret in <code class="rounded bg-sand px-1">.env</code> ein und klick danach in der App erneut auf verbinden.
        </p>
        <ol class="mt-4 list-decimal space-y-2 pl-5 text-sm text-ink-soft">
          <li>
            <a class="font-medium text-strava underline" href="https://www.strava.com/settings/api" target="_blank" rel="noreferrer">strava.com/settings/api</a>
          </li>
          <li>Authorization Callback Domain: <code class="rounded bg-sand px-1">trainer-psi-three.vercel.app</code> (ohne https)</li>
        </ol>
        <button type="button" class="mt-5 w-full rounded-xl bg-ink py-2.5 text-sm font-semibold text-paper" @click="showSetup = false; router.push({ name: 'today' })">
          Zur Demo, später verbinden
        </button>
      </div>
    </div>
  </main>
</template>
