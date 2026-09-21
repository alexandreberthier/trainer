export type Sport = 'swim' | 'bike' | 'run' | 'strength' | 'brick' | 'rest'
export type TrainableSport = 'swim' | 'bike' | 'run' | 'strength'
export type RaceDistance = 'sprint' | 'olympic' | 'half' | 'ironman'
export type Phase = 'base' | 'build' | 'peak' | 'taper'
export type Intensity = 'recovery' | 'easy' | 'steady' | 'threshold' | 'vo2' | 'race' | 'test'

export type Confidence = 'high' | 'medium' | 'low' | 'none'

export interface StravaBestEffort {
  name: string
  distance: number
  elapsed_time: number
  moving_time?: number
  start_date?: string
}

export interface Activity {
  id: number
  name: string
  sport: 'swim' | 'bike' | 'run' | 'other'
  type?: string
  start_date: string
  distance_m: number
  moving_time_s: number
  elapsed_time_s: number
  total_elevation_gain?: number
  average_heartrate?: number
  average_watts?: number
  weighted_average_watts?: number
  device_watts?: boolean
  average_speed?: number
  best_efforts?: StravaBestEffort[]
  laps?: Array<{
    distance: number
    moving_time: number
    elapsed_time?: number
    average_watts?: number
  }>
}

export interface PaceZone {
  key: string
  label: string
  intensity: Intensity
  /** seconds per km (run) or seconds per 100m (swim) */
  paceSec?: number
  paceLowSec?: number
  paceHighSec?: number
  /** watts */
  watts?: number
  wattsLow?: number
  wattsHigh?: number
  /** percent of threshold */
  pctLow: number
  pctHigh: number
}

export interface RunFitness {
  vdot: number | null
  criticalSpeedMps: number | null
  thresholdPaceSecPerKm: number | null
  source: string
  confidence: Confidence
  bestEfforts: Array<{ label: string; timeSec: number; date: string; vdot: number }>
  zones: PaceZone[]
}

export interface BikeFitness {
  ftpWatts: number | null
  estimatedFtpWatts: number | null
  stravaFtpWatts: number | null
  source: string
  confidence: Confidence
  best20minWatts: number | null
  best60minWatts: number | null
  hasPower: boolean
  lthr: number | null
  zones: PaceZone[]
}

export interface SwimFitness {
  cssSecPer100: number | null
  source: string
  confidence: Confidence
  needsTest: boolean
  best400Sec?: number
  best200Sec?: number
  zones: PaceZone[]
}

export interface FitnessSnapshot {
  calculatedAt: string
  windowWeeks: number
  weeklyHours: number
  weeklyHoursBySport: { swim: number; bike: number; run: number }
  run: RunFitness
  bike: BikeFitness
  swim: SwimFitness
  warnings: string[]
}

export interface AthleteProfile {
  displayName: string
  raceType: RaceDistance
  raceDate: string
  raceName: string
  weeklyHoursTarget: number
  availableDays: number[]
  enabledSports: TrainableSport[]
  stravaAthleteId?: number
  stravaConnected: boolean
  demoMode: boolean
  stravaFtpWatts?: number | null
  ftpWattsOverride?: number | null
  runThresholdSecOverride?: number | null
  cssSecPer100Override?: number | null
}

export interface WorkoutBlock {
  id: string
  label: string
  durationMin?: number
  repeats?: number
  /** inner steps for repeats */
  steps?: Array<{
    label: string
    durationMin?: number
    distanceM?: number
    target: string
    intensity: Intensity
  }>
  distanceM?: number
  target: string
  intensity: Intensity
}

export interface PlannedWorkout {
  id: string
  date: string
  sport: Sport
  title: string
  phase: Phase
  intensity: Intensity
  durationMin: number
  description: string
  structure: WorkoutBlock[]
  completedActivityId?: number
}

export interface TrainingPlan {
  id: string
  startDate: string
  raceDate: string
  raceType: RaceDistance
  weeklyHoursStart: number
  weeklyHoursPeak: number
  workouts: PlannedWorkout[]
}

export interface SessionState {
  userId: string | null
  accessToken: string | null
  refreshToken: string | null
  expiresAt: number | null
}
