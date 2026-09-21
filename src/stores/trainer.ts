import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { analyzeActivities } from '@/lib/fitness/analyze'
import { demoActivities } from '@/lib/demo'
import { generatePlan } from '@/lib/plan/generate'
import type { Activity, AthleteProfile, FitnessSnapshot, RaceDistance, TrainableSport, TrainingPlan } from '@/lib/types'
import { isoDate } from '@/lib/format'

const STORAGE_KEY = 'trainer-state-v1'
const PLAN_VERSION = 3

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
    enabledSports: ['swim', 'bike', 'run'],
    stravaConnected: false,
    demoMode: false,
    stravaFtpWatts: null,
    ftpWattsOverride: null,
    runThresholdSecOverride: null,
    cssSecPer100Override: null,
  }
}

function normalizeProfile(raw?: Partial<AthleteProfile> | null): AthleteProfile {
  const base = defaultProfile()
  if (!raw) return base
  const sports = raw.enabledSports?.filter(Boolean)
  return {
    ...base,
    ...raw,
    enabledSports: sports?.length ? sports : base.enabledSports,
    availableDays: raw.availableDays?.length ? raw.availableDays : base.availableDays,
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

export function hasSport(profile: AthleteProfile, sport: TrainableSport): boolean {
  return profile.enabledSports.includes(sport)
}

export const useTrainerStore = defineStore('trainer', () => {
  const saved = load()
  const profile = ref<AthleteProfile>(normalizeProfile(saved?.profile))
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
    fitness.value = analyzeActivities(activities.value, {
      stravaFtpWatts: profile.value.stravaFtpWatts,
      ftpWattsOverride: profile.value.ftpWattsOverride,
      runThresholdSecOverride: profile.value.runThresholdSecOverride,
      cssSecPer100Override: profile.value.cssSecPer100Override,
      enabledSports: profile.value.enabledSports,
    })
    plan.value = generatePlan({
      raceType: profile.value.raceType,
      raceDate: profile.value.raceDate,
      weeklyHoursTarget: profile.value.weeklyHoursTarget,
      availableDays: profile.value.availableDays,
      fitness: fitness.value,
      enabledSports: profile.value.enabledSports,
    })
    planVersion.value = PLAN_VERSION
    persist()
  }

  function startDemo(overrides: Partial<AthleteProfile> = {}) {
    profile.value = normalizeProfile({
      ...defaultProfile(),
      ...overrides,
      displayName: overrides.displayName || 'Alex',
      demoMode: true,
      stravaConnected: false,
    })
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
    enabledSports: TrainableSport[]
    displayName: string
    useDemo: boolean
  }) {
    profile.value = normalizeProfile({
      ...profile.value,
      ...next,
      demoMode: next.useDemo,
    })
    if (next.useDemo || activities.value.length === 0) {
      activities.value = demoActivities()
      profile.value.demoMode = true
    }
    athleteName.value = next.displayName
    onboardingDone.value = true
    rebuild()
  }

  function setActivities(
    next: Activity[],
    extras: { connected?: boolean; stravaFtpWatts?: number | null } = {},
  ) {
    activities.value = next
    profile.value.stravaConnected = extras.connected ?? true
    profile.value.demoMode = !profile.value.stravaConnected
    if (extras.stravaFtpWatts != null) profile.value.stravaFtpWatts = extras.stravaFtpWatts
    rebuild()
  }

  function updateProfile(patch: Partial<AthleteProfile>, rebuildPlan = true) {
    profile.value = normalizeProfile({ ...profile.value, ...patch })
    if (rebuildPlan) rebuild()
    else persist()
  }

  function toggleSport(sport: TrainableSport) {
    const current = [...profile.value.enabledSports]
    const idx = current.indexOf(sport)
    if (idx >= 0) {
      if (current.filter((s) => s !== 'strength').length <= 1 && sport !== 'strength') return
      current.splice(idx, 1)
    } else {
      current.push(sport)
    }
    updateProfile({ enabledSports: current })
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
    updateProfile,
    toggleSport,
    rebuild,
    resetAll,
    persist,
    needsRebuild: () => planVersion.value !== PLAN_VERSION,
  }
})
