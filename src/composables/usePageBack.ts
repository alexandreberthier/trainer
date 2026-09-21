import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

export function usePageBack() {
  const route = useRoute()
  const router = useRouter()

  const label = computed(() => {
    const from = route.query.from
    if (from === 'calendar') return 'Zurück zum Kalender'
    if (from === 'today') return 'Zurück zu Heute'
    if (from === 'werte') return 'Zurück zu Werte'
    return 'Zurück'
  })

  function back() {
    const from = route.query.from
    if (from === 'calendar') {
      const day = typeof route.query.day === 'string' ? route.query.day : undefined
      void router.push({ name: 'calendar', query: day ? { day } : {} })
      return
    }
    if (from === 'today') {
      void router.push({ name: 'today' })
      return
    }
    if (from === 'werte') {
      void router.push({ name: 'fitness' })
      return
    }
    if (window.history.state?.back) {
      router.back()
      return
    }
    void router.push({ name: 'today' })
  }

  return { label, back }
}
