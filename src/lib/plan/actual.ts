import type { Activity, PlannedWorkout } from '../types'
import { isoDate } from '../format'

export function activityDay(activity: Activity): string {
  return isoDate(new Date(activity.start_date))
}

function sportsForWorkout(workout: PlannedWorkout): Array<Activity['sport']> {
  if (workout.sport === 'brick') return ['bike', 'run']
  if (workout.sport === 'swim' || workout.sport === 'bike' || workout.sport === 'run') return [workout.sport]
  return []
}

export function matchActivities(workout: PlannedWorkout, activities: Activity[]): Activity[] {
  const sports = sportsForWorkout(workout)
  if (!sports.length) return []
  return activities
    .filter((activity) => activityDay(activity) === workout.date && sports.includes(activity.sport))
    .sort((a, b) => b.moving_time_s - a.moving_time_s)
}

export type ActualStatus = 'done' | 'short' | 'long' | 'missing'

export interface SessionActual {
  status: ActualStatus
  matches: Activity[]
  plannedMin: number
  actualMin: number
  actualDistanceKm: number | null
  actualPaceSecPerKm: number | null
  summary: string
}

export function sessionActual(workout: PlannedWorkout, activities: Activity[]): SessionActual {
  const matches = matchActivities(workout, activities)
  const plannedMin = workout.durationMin
  const actualSec = matches.reduce((sum, activity) => sum + activity.moving_time_s, 0)
  const actualMin = actualSec / 60
  const distance = matches.reduce((sum, activity) => sum + activity.distance_m, 0)
  const actualDistanceKm = distance > 0 ? distance / 1000 : null
  const runLike = matches.filter((activity) => activity.sport === 'run' || activity.sport === 'swim')
  const paceDistance = runLike.reduce((sum, activity) => sum + activity.distance_m, 0)
  const paceTime = runLike.reduce((sum, activity) => sum + activity.moving_time_s, 0)
  const actualPaceSecPerKm =
    paceDistance >= 400 && paceTime > 0 ? (paceTime / paceDistance) * (workout.sport === 'swim' ? 100 : 1000) : null

  if (!matches.length) {
    const today = isoDate(new Date())
    const summary = workout.date > today ? 'Liegt noch in der Zukunft.' : 'Keine passende Strava-Einheit an diesem Tag.'
    return {
      status: 'missing',
      matches,
      plannedMin,
      actualMin: 0,
      actualDistanceKm,
      actualPaceSecPerKm,
      summary,
    }
  }

  const ratio = actualMin / Math.max(1, plannedMin)
  const status: ActualStatus = ratio < 0.75 ? 'short' : ratio > 1.25 ? 'long' : 'done'
  const delta = Math.round(actualMin - plannedMin)
  const deltaText = delta === 0 ? 'wie geplant' : delta > 0 ? `${delta} min länger` : `${Math.abs(delta)} min kürzer`
  const names = matches.map((activity) => activity.name).join(', ')
  return {
    status,
    matches,
    plannedMin,
    actualMin: Math.round(actualMin),
    actualDistanceKm,
    actualPaceSecPerKm,
    summary: `${names} · ${deltaText}`,
  }
}
