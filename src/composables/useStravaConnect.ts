import { ref } from 'vue'
import { isStravaConfigured, stravaAuthorizeUrl } from '@/lib/strava'
import type { Activity } from '@/lib/types'
import { useTrainerStore } from '@/stores/trainer'

export function useStravaConnect() {
  const store = useTrainerStore()
  const syncing = ref(false)
  const error = ref<string | null>(null)
  const showSetup = ref(false)

  function connect() {
    error.value = null
    if (!isStravaConfigured()) {
      showSetup.value = true
      return
    }
    window.location.href = stravaAuthorizeUrl()
  }

  async function sync() {
    syncing.value = true
    error.value = null
    try {
      const res = await fetch('/api/strava/sync')
      const data = (await res.json()) as {
        error?: string
        athleteName?: string
        activities?: unknown[]
        stravaFtp?: number | null
      }
      if (!res.ok) throw new Error(data.error || 'Sync fehlgeschlagen')
      store.athleteName = data.athleteName ?? store.athleteName
      store.setActivities((data.activities as Activity[] | undefined) ?? [], {
        connected: true,
        stravaFtpWatts: data.stravaFtp ?? null,
      })
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Sync fehlgeschlagen'
    } finally {
      syncing.value = false
    }
  }

  function closeSetup() {
    showSetup.value = false
  }

  return {
    store,
    configured: isStravaConfigured(),
    syncing,
    error,
    showSetup,
    connect,
    sync,
    closeSetup,
  }
}
