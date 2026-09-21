import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { analyzeActivities } from '@/lib/fitness/analyze'
import { demoActivities } from '@/lib/demo'
import { generatePlan } from '@/lib/plan/generate'
import type { Activity, AthleteProfile, FitnessSnapshot, RaceDistance, TrainingPlan } from '@/lib/types'
import { isoDate } from '@/lib/format'

const STORAGE_KEY = 'trainer-state-v1'
const PLAN_VERSION = 2

export interface PersistedState {
  profile: AthleteProfile
  activities: Activity[]
  fitness: FitnessSnapshot | null
  plan: TrainingPlan | null
  session: { userId: string | null; athleteName: string | null }
  planVersion?: number
}

function defaultProfile(): AthleteProfile {
  const race = new Date()
  race.setDate(race.getDate() + 16 * 7)
  return {
    displayName: '',
    raceType: 'olympic',
    raceDate: isoDate(race),
    raceName: '',
    weeklyHoursTarget: 7,
    availableDays: [0, 1, 2, 3, 4, 5],
    stravaConnected: false,
    demoMode: false,
  }
}

function load(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as PersistedState) : null
  } catch {
    return null
  }
}

export const useTrainerStore = defineStore('trainer', () => {
  const saved = load()
  const profile = ref<AthleteProfile>(saved?.profile ?? defaultProfile())
  const activities = ref<Activity[]>(saved?.activities ?? [])
  const fitness = ref<FitnessSnapshot | null>(saved?.fitness ?? null)
  const plan = ref<TrainingPlan | null>(saved?.plan ?? null)
  const athleteName = ref(saved?.session.athleteName ?? null)
  const onboardingDone = ref(Boolean(saved?.plan))
  const loading = ref(false)
  const error = ref<string | null>(null)
  const planVersion = ref(saved?.planVersion ?? 0)

  function persist() {
    const payload: PersistedState = {
      profile: profile.value,
      activities: activities.value,
      fitness: fitness.value,
      plan: plan.value,
      session: { userId: null, athleteName: athleteName.value },
      planVersion: planVersion.value,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }

  function rebuild() {
    fitness.value = analyzeActivities(activities.value)
    plan.value = generatePlan({
      raceType: profile.value.raceType,
      raceDate: profile.value.raceDate,
      weeklyHoursTarget: profile.value.weeklyHoursTarget,
      availableDays: profile.value.availableDays,
      fitness: fitness.value,
    })
    planVersion.value = PLAN_VERSION
    persist()
  }

  function startDemo(overrides: Partial<AthleteProfile> = {}) {
    profile.value = {
      ...defaultProfile(),
      ...overrides,
      displayName: overrides.displayName || 'Alex',
      demoMode: true,
      stravaConnected: false,
    }
    activities.value = demoActivities()
    athleteName.value = profile.value.displayName
    onboardingDone.value = true
    rebuild()
  }

  function completeOnboarding(next: {
    raceType: RaceDistance
    raceDate: string
    raceName: string
    weeklyHoursTarget: number
    availableDays: number[]
    displayName: string
    useDemo: boolean
  }) {
    profile.value = {
      ...profile.value,
      ...next,
      demoMode: next.useDemo,
    }
    if (next.useDemo || activities.value.length === 0) {
      activities.value = demoActivities()
      profile.value.demoMode = true
    }
    athleteName.value = next.displayName
    onboardingDone.value = true
    rebuild()
  }

  function setActivities(next: Activity[], connected = true) {
    activities.value = next
    profile.value.stravaConnected = connected
    profile.value.demoMode = !connected
    rebuild()
  }

  function resetAll() {
    localStorage.removeItem(STORAGE_KEY)
    profile.value = defaultProfile()
    activities.value = []
    fitness.value = null
    plan.value = null
    athleteName.value = null
    onboardingDone.value = false
  }

  const todayWorkouts = computed(() => {
    const today = isoDate(new Date())
    return plan.value?.workouts.filter((w) => w.date === today) ?? []
  })

  return {
    profile,
    activities,
    fitness,
    plan,
    athleteName,
    onboardingDone,
    loading,
    error,
    todayWorkouts,
    startDemo,
    completeOnboarding,
    setActivities,
    rebuild,
    resetAll,
    persist,
    needsRebuild: () => planVersion.value !== PLAN_VERSION,
  }
})
