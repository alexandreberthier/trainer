<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import StravaButton from '@/components/StravaButton.vue'
import { useStravaConnect } from '@/composables/useStravaConnect'
import { useTrainerStore } from '@/stores/trainer'

const store = useTrainerStore()
const route = useRoute()
const router = useRouter()
const { syncing, error, sync } = useStravaConnect()

onMounted(async () => {
  if (store.needsRebuild()) store.rebuild()
  const oauthError = route.query.strava_error
  if (typeof oauthError === 'string' && oauthError) {
    error.value = oauthError
    void router.replace({ path: route.path, query: {} })
    return
  }
  if (route.query.strava === 'connected') {
    await sync()
    void router.replace({ path: route.path, query: {} })
    return
  }
  if (store.profile.stravaConnected && store.profile.stravaFtpWatts == null) {
    await sync()
  }
})

function resetApp() {
  store.resetAll()
  void router.push('/')
}

function navActive(tab: 'today' | 'calendar' | 'fitness') {
  if (route.name === 'workout') {
    if (route.query.from === 'calendar') return tab === 'calendar'
    if (route.query.from === 'werte') return tab === 'fitness'
    return tab === 'today'
  }
  if (tab === 'today') return route.name === 'today'
  if (tab === 'calendar') return route.name === 'calendar'
  return route.name === 'fitness'
}

function navClass(tab: 'today' | 'calendar' | 'fitness') {
  return navActive(tab) ? 'bg-sand font-medium text-ink' : 'text-muted'
}

const calendarLink = computed(() => {
  const day = typeof route.query.day === 'string' ? route.query.day : undefined
  return day ? { name: 'calendar' as const, query: { day } } : { name: 'calendar' as const }
})
</script>

<template>
  <div class="min-h-screen bg-sand">
    <header class="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur">
      <div class="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
        <RouterLink to="/app" class="shrink-0 text-base font-semibold tracking-tight">Trainer</RouterLink>
        <nav class="flex flex-1 items-center justify-center gap-0.5 text-sm sm:justify-start sm:pl-6">
          <RouterLink to="/app" class="rounded-lg px-3 py-1.5" :class="navClass('today')">Heute</RouterLink>
          <RouterLink :to="calendarLink" class="rounded-lg px-3 py-1.5" :class="navClass('calendar')">Kalender</RouterLink>
          <RouterLink to="/app/fitness" class="rounded-lg px-3 py-1.5" :class="navClass('fitness')">Werte</RouterLink>
        </nav>
        <StravaButton />
      </div>
    </header>

    <p v-if="syncing" class="bg-ink px-4 py-2 text-center text-sm text-paper">Strava-Daten werden analysiert …</p>
    <p v-if="error" class="bg-run px-4 py-2 text-center text-sm text-paper">{{ error }}</p>

    <div
      v-if="store.profile.demoMode && !store.profile.stravaConnected"
      class="border-b border-line bg-paper"
    >
      <div class="mx-auto max-w-6xl px-4 py-2.5 text-sm text-muted sm:px-6">
        Du siehst Beispieldaten. Oben rechts mit Strava verbinden, dann kommen echte Paces.
      </div>
    </div>

    <RouterView />

    <footer class="mx-auto max-w-6xl px-4 py-8 text-center text-xs text-muted sm:px-6">
      <button type="button" class="hover:text-ink" @click="resetApp">Daten zurücksetzen</button>
    </footer>
  </div>
</template>
