<script setup lang="ts">
import { onMounted } from 'vue'
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
  if (route.query.strava === 'connected') {
    await sync()
    history.replaceState({}, '', '/app')
  }
})

function resetApp() {
  store.resetAll()
  void router.push('/')
}
</script>

<template>
  <div class="min-h-screen bg-sand">
    <header class="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur">
      <div class="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
        <RouterLink to="/app" class="shrink-0 text-base font-semibold tracking-tight">Trainer</RouterLink>
        <nav class="flex flex-1 items-center justify-center gap-0.5 text-sm sm:justify-start sm:pl-6">
          <RouterLink to="/app" class="rounded-lg px-3 py-1.5 text-muted" exact-active-class="bg-sand font-medium text-ink">Heute</RouterLink>
          <RouterLink to="/app/calendar" class="rounded-lg px-3 py-1.5 text-muted" active-class="bg-sand font-medium text-ink">Kalender</RouterLink>
          <RouterLink to="/app/fitness" class="rounded-lg px-3 py-1.5 text-muted" active-class="bg-sand font-medium text-ink">Paces</RouterLink>
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
