import type { Activity } from './types'

export function mapStravaActivity(raw: Record<string, unknown>): Activity {
  const type = String(raw.sport_type || raw.type || '')
  const sport: Activity['sport'] = /swim/i.test(type)
    ? 'swim'
    : /ride|bike/i.test(type)
      ? 'bike'
      : /run/i.test(type)
        ? 'run'
        : 'other'

  const best = Array.isArray(raw.best_efforts)
    ? (raw.best_efforts as Array<Record<string, unknown>>).map((be) => ({
        name: String(be.name ?? ''),
        distance: Number(be.distance ?? 0),
        elapsed_time: Number(be.elapsed_time ?? 0),
        moving_time: Number(be.moving_time ?? be.elapsed_time ?? 0),
        start_date: String(be.start_date ?? raw.start_date ?? ''),
      }))
    : undefined

  const laps = Array.isArray(raw.laps)
    ? (raw.laps as Array<Record<string, unknown>>).map((lap) => ({
        distance: Number(lap.distance ?? 0),
        moving_time: Number(lap.moving_time ?? 0),
        elapsed_time: Number(lap.elapsed_time ?? 0),
        average_watts: lap.average_watts != null ? Number(lap.average_watts) : undefined,
      }))
    : undefined

  return {
    id: Number(raw.id),
    name: String(raw.name ?? 'Aktivität'),
    sport,
    type,
    start_date: String(raw.start_date ?? ''),
    distance_m: Number(raw.distance ?? 0),
    moving_time_s: Number(raw.moving_time ?? 0),
    elapsed_time_s: Number(raw.elapsed_time ?? 0),
    total_elevation_gain: raw.total_elevation_gain != null ? Number(raw.total_elevation_gain) : undefined,
    average_heartrate: raw.average_heartrate != null ? Number(raw.average_heartrate) : undefined,
    average_watts: raw.average_watts != null ? Number(raw.average_watts) : undefined,
    weighted_average_watts: raw.weighted_average_watts != null ? Number(raw.weighted_average_watts) : undefined,
    device_watts: Boolean(raw.device_watts),
    average_speed: raw.average_speed != null ? Number(raw.average_speed) : undefined,
    best_efforts: best,
    laps,
  }
}
