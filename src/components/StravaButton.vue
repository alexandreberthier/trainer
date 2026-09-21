<script setup lang="ts">
import { useStravaConnect } from '@/composables/useStravaConnect'

withDefaults(
  defineProps<{
    variant?: 'header' | 'hero'
    connectLabel?: string
  }>(),
  { variant: 'header', connectLabel: 'Mit Strava verbinden' },
)

const { store, syncing, error, showSetup, connect, sync, closeSetup } = useStravaConnect()

function onClick() {
  if (store.profile.stravaConnected) void sync()
  else connect()
}
</script>

<template>
  <div :class="variant === 'hero' ? 'w-full' : ''">
    <button
      type="button"
      class="inline-flex items-center justify-center gap-2 font-semibold text-white transition disabled:opacity-60"
      :class="
        variant === 'hero'
          ? 'w-full rounded-xl bg-strava px-5 py-3.5 text-base shadow-sm hover:bg-strava-2'
          : 'rounded-lg bg-strava px-3 py-2 text-sm hover:bg-strava-2'
      "
      :disabled="syncing"
      @click="onClick"
    >
      <svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M15.39 17.94 13.3 13.83H10.24L15.39 24l5.15-10.17h-3.07m-7.01-5.6 2.92 5.85h3.06L9.28 0 4.22 10.17h3.07" />
      </svg>
      <span v-if="syncing">Lade Strava …</span>
      <span v-else-if="store.profile.stravaConnected">{{ store.athleteName ? `Strava · Sync` : 'Strava aktualisieren' }}</span>
      <span v-else>{{ connectLabel }}</span>
    </button>
    <p v-if="error && variant === 'hero'" class="mt-2 text-sm text-run">{{ error }}</p>

    <div v-if="showSetup" class="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center" @click.self="closeSetup">
      <div class="w-full max-w-md rounded-2xl bg-paper p-6 shadow-xl">
        <h2 class="text-lg font-semibold">Strava einrichten</h2>
        <p class="mt-2 text-sm leading-relaxed text-muted">
          Dafür brauchst du eine kostenlose API-App bei Strava. Dauert etwa zwei Minuten.
        </p>
        <ol class="mt-4 list-decimal space-y-2 pl-5 text-sm text-ink-soft">
          <li>
            Öffne
            <a class="font-medium text-strava underline" href="https://www.strava.com/settings/api" target="_blank" rel="noreferrer">strava.com/settings/api</a>
          </li>
          <li>Callback Domain: <code class="rounded bg-sand px-1">localhost</code></li>
          <li>Client ID und Secret in die lokale <code class="rounded bg-sand px-1">.env</code> eintragen, Devserver neu starten.</li>
        </ol>
        <div class="mt-5 flex justify-end gap-2">
          <button type="button" class="rounded-lg px-3 py-2 text-sm text-muted" @click="closeSetup">Schließen</button>
        </div>
      </div>
    </div>
  </div>
</template>
