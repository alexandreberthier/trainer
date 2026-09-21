<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useTrainerStore } from '@/stores/trainer'

const store = useTrainerStore()
const route = useRoute()
const router = useRouter()
const syncing = ref(false)
const syncError = ref<string | null>(null)

async function syncStrava() {
  syncing.value = true
  syncError.value = null
  try {
    const res = await fetch('/api/strava/sync')
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Sync fehlgeschlagen')
    store.athleteName = data.athleteName
    store.setActivities(data.activities, true)
  } catch (e) {
    syncError.value = e instanceof Error ? e.message : 'Sync fehlgeschlagen'
  } finally {
    syncing.value = false
  }
}

onMounted(async () => {
  if (store.needsRebuild()) store.rebuild()
  if (route.query.strava === 'connected') {
    await syncStrava()
    history.replaceState({}, '', '/app')
  }
})

function resetApp() {
  store.resetAll()
  void router.push('/')
}
</script>

<template>
  <div class="grain min-h-screen">
    <header class="border-b border-line/80 bg-sand/80 backdrop-blur">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <RouterLink to="/app" class="font-display text-xl">Trainer</RouterLink>
        <nav class="flex items-center gap-1 text-sm">
          <RouterLink to="/app" class="rounded-full px-3 py-1.5" exact-active-class="bg-ink text-sand">Heute</RouterLink>
          <RouterLink to="/app/calendar" class="rounded-full px-3 py-1.5" active-class="bg-ink text-sand">Kalender</RouterLink>
          <RouterLink to="/app/fitness" class="rounded-full px-3 py-1.5" active-class="bg-ink text-sand">Paces</RouterLink>
          <button type="button" class="ml-2 text-xs text-ink-soft" @click="resetApp">Reset</button>
        </nav>
      </div>
    </header>

    <p v-if="syncing" class="bg-teal-2 px-4 py-2 text-center text-sm text-sand">Strava-Daten werden analysiert …</p>
    <p v-if="syncError" class="bg-coral px-4 py-2 text-center text-sm text-paper">{{ syncError }}</p>

    <RouterView />
  </div>
</template>
