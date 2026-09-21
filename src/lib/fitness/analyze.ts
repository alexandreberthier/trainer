import type { Activity, BikeFitness, Confidence, FitnessSnapshot, PaceZone, RunFitness, SwimFitness } from '../types'
import { hoursFromSeconds } from '../format'
import { distanceForEffortName, paceSecPerKmFromVdot, vdotFromRace, VDOT_INTENSITIES } from './vdot'

const WINDOW_WEEKS = 12
const MS_WEEK = 7 * 24 * 3600 * 1000

function inWindow(iso: string, weeks = WINDOW_WEEKS): boolean {
  return Date.now() - new Date(iso).getTime() < weeks * MS_WEEK
}

function median(values: number[]): number {
  if (!values.length) return 0
  const s = [...values].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

function classifySport(a: Activity): 'swim' | 'bike' | 'run' | 'other' {
  if (a.sport === 'swim' || a.sport === 'bike' || a.sport === 'run') return a.sport
  const t = (a.type ?? '').toLowerCase()
  if (t.includes('swim')) return 'swim'
  if (t.includes('ride') || t.includes('bike') || t.includes('virtualride')) return 'bike'
  if (t.includes('run')) return 'run'
  return 'other'
}

function recencyWeight(iso: string): number {
  const weeksAgo = (Date.now() - new Date(iso).getTime()) / MS_WEEK
  if (weeksAgo <= 3) return 1
  if (weeksAgo <= 6) return 0.85
  if (weeksAgo <= 9) return 0.7
  return 0.55
}

function runZones(thresholdSec: number, vdot: number): PaceZone[] {
  const easyLow = paceSecPerKmFromVdot(vdot, VDOT_INTENSITIES.easyLow)
  const easyHigh = paceSecPerKmFromVdot(vdot, VDOT_INTENSITIES.easyHigh)
  return [
    {
      key: 'easy',
      label: 'Easy',
      intensity: 'easy',
      paceLowSec: Math.min(easyLow, easyHigh),
      paceHighSec: Math.max(easyLow, easyHigh),
      pctLow: 59,
      pctHigh: 74,
    },
    {
      key: 'steady',
      label: 'Steady',
      intensity: 'steady',
      paceSec: Math.round(thresholdSec * 1.12),
      pctLow: 80,
      pctHigh: 88,
    },
    {
      key: 'threshold',
      label: 'Schwelle',
      intensity: 'threshold',
      paceSec: Math.round(thresholdSec),
      pctLow: 95,
      pctHigh: 100,
    },
    {
      key: 'vo2',
      label: 'VO2 / Intervalle',
      intensity: 'vo2',
      paceSec: Math.round(paceSecPerKmFromVdot(vdot, VDOT_INTENSITIES.interval)),
      pctLow: 105,
      pctHigh: 110,
    },
    {
      key: 'rep',
      label: 'Reps',
      intensity: 'vo2',
      paceSec: Math.round(paceSecPerKmFromVdot(vdot, VDOT_INTENSITIES.repetition)),
      pctLow: 115,
      pctHigh: 120,
    },
  ]
}

function analyzeRun(activities: Activity[]): RunFitness {
  const runs = activities.filter((a) => classifySport(a) === 'run' && a.moving_time_s >= 8 * 60)
  const efforts: Array<{ label: string; timeSec: number; date: string; vdot: number; distance: number }> = []

  for (const run of runs) {
    for (const be of run.best_efforts ?? []) {
      const distance = distanceForEffortName(be.name, be.distance)
      if (distance < 1000 || distance > 42200) continue
      const time = be.moving_time || be.elapsed_time
      if (time <= 0) continue
      const vdot = vdotFromRace(distance, time)
      if (vdot < 25 || vdot > 90) continue
      efforts.push({
        label: be.name,
        timeSec: time,
        date: be.start_date || run.start_date,
        vdot,
        distance,
      })
    }
    // Fallback: whole activity as a time-trial if it looks like a race / hard effort
    if (!run.best_efforts?.length && run.distance_m >= 3000 && run.distance_m <= 25000) {
      const vdot = vdotFromRace(run.distance_m, run.moving_time_s)
      if (vdot >= 30 && vdot <= 85) {
        efforts.push({
          label: `${Math.round(run.distance_m / 100) / 10} km`,
          timeSec: run.moving_time_s,
          date: run.start_date,
          vdot,
          distance: run.distance_m,
        })
      }
    }
  }

  // Keep the best (highest VDOT) per distance bucket, recency-weighted pick
  const byLabel = new Map<string, (typeof efforts)[0]>()
  for (const e of efforts) {
    const prev = byLabel.get(e.label)
    const score = e.vdot * recencyWeight(e.date)
    const prevScore = prev ? prev.vdot * recencyWeight(prev.date) : 0
    if (!prev || score > prevScore) byLabel.set(e.label, e)
  }
  const unique = [...byLabel.values()].sort((a, b) => b.vdot * recencyWeight(b.date) - a.vdot * recencyWeight(a.date))

  const preferred = unique.filter((e) => e.distance >= 3000 && e.distance <= 22000)
  const pool = preferred.length ? preferred : unique

  let vdot: number | null = null
  let source = 'Keine harte Laufleistung in den letzten 12 Wochen.'
  if (pool.length) {
    const top = pool.slice(0, 3)
    const weighted = top.map((e) => e.vdot * recencyWeight(e.date))
    // Conservative: closer to median than max, so one outlier PR doesn't dictate training
    const max = Math.max(...weighted)
    const med = median(weighted)
    vdot = Math.round((med * 0.65 + max * 0.35) * 10) / 10
    source = `Aus ${top.map((e) => `${e.label} (${new Date(e.date).toLocaleDateString('de-DE')})`).join(', ')}`
  }

  let criticalSpeedMps: number | null = null
  const five = unique.find((e) => Math.abs(e.distance - 5000) < 200)
  const ten = unique.find((e) => Math.abs(e.distance - 10000) < 300)
  if (five && ten && ten.timeSec > five.timeSec) {
    criticalSpeedMps = (ten.distance - five.distance) / (ten.timeSec - five.timeSec)
  }

  const thresholdPaceSecPerKm =
    vdot != null
      ? Math.round(paceSecPerKmFromVdot(vdot, VDOT_INTENSITIES.threshold))
      : criticalSpeedMps
        ? Math.round(1000 / criticalSpeedMps)
        : null

  // Easy-run fallback if no quality efforts
  if (vdot == null) {
    const easyRuns = runs.filter((r) => r.distance_m >= 4000 && (r.total_elevation_gain ?? 0) / r.distance_m < 0.02)
    if (easyRuns.length >= 4) {
      const paces = easyRuns.map((r) => r.moving_time_s / (r.distance_m / 1000))
      const easy = median(paces)
      const threshold = easy / 1.26
      vdot = Math.round(vdotFromRace(10000, (threshold / 1000) * 10000) * 10) / 10
      source = 'Geschätzt aus lockeren Dauerläufen (unsicher — kein Test/Wettkampf).'
    }
  }

  const conf: Confidence =
    vdot == null ? 'none' : pool.length >= 2 && preferred.length ? 'high' : pool.length ? 'medium' : 'low'

  return {
    vdot,
    criticalSpeedMps,
    thresholdPaceSecPerKm:
      vdot != null ? Math.round(paceSecPerKmFromVdot(vdot, VDOT_INTENSITIES.threshold)) : thresholdPaceSecPerKm,
    source,
    confidence: conf,
    bestEfforts: unique.slice(0, 6).map(({ label, timeSec, date, vdot: v }) => ({ label, timeSec, date, vdot: v })),
    zones: vdot != null ? runZones(paceSecPerKmFromVdot(vdot, VDOT_INTENSITIES.threshold), vdot) : [],
  }
}

function bestAvgWatts(activity: Activity, windowSec: number): number | null {
  const watts = activity.weighted_average_watts || activity.average_watts
  if (!watts || watts < 50) return null
  if (activity.moving_time_s >= windowSec * 0.9) return watts
  return null
}

function analyzeBike(activities: Activity[]): BikeFitness {
  const rides = activities.filter((a) => classifySport(a) === 'bike' && a.moving_time_s >= 20 * 60)
  const withPower = rides.filter((r) => r.device_watts || (r.average_watts && r.average_watts > 60))

  const w20 = withPower
    .map((r) => {
      if (r.moving_time_s >= 18 * 60 && r.moving_time_s <= 30 * 60) {
        return (r.weighted_average_watts || r.average_watts || 0) * recencyWeight(r.start_date)
      }
      return bestAvgWatts(r, 20 * 60) ? (r.weighted_average_watts || r.average_watts || 0) * 0.92 * recencyWeight(r.start_date) : 0
    })
    .filter((w) => w > 80)

  const w60 = withPower
    .filter((r) => r.moving_time_s >= 50 * 60)
    .map((r) => (r.weighted_average_watts || r.average_watts || 0) * recencyWeight(r.start_date))
    .filter((w) => w > 80)

  const best20 = w20.length ? Math.max(...w20) : null
  const best60 = w60.length ? Math.max(...w60) : null

  let ftp: number | null = null
  let source = 'Kein Powermeter in den letzten 12 Wochen.'
  let confidence: Confidence = 'none'

  if (best60 && best20) {
    ftp = Math.round(Math.min(best60, best20 * 0.95))
    source = `20-min ≈ ${Math.round(best20)} W, 60-min ≈ ${Math.round(best60)} W`
    confidence = 'high'
  } else if (best20) {
    ftp = Math.round(best20 * 0.95)
    source = `20-min Bestleistung ≈ ${Math.round(best20)} W × 0,95`
    confidence = 'medium'
  } else if (best60) {
    ftp = Math.round(best60)
    source = `Längste harte Fahrt ≈ ${Math.round(best60)} W`
    confidence = 'medium'
  }

  const hrRides = rides.filter((r) => (r.average_heartrate ?? 0) > 120)
  const lthr = hrRides.length >= 3 ? Math.round(median(hrRides.map((r) => r.average_heartrate!)) * 0.95 + 8) : null

  const zones: PaceZone[] = ftp
    ? [
        { key: 'endurance', label: 'Ausdauer', intensity: 'easy', wattsLow: Math.round(ftp * 0.56), wattsHigh: Math.round(ftp * 0.75), pctLow: 56, pctHigh: 75 },
        { key: 'tempo', label: 'Tempo', intensity: 'steady', wattsLow: Math.round(ftp * 0.76), wattsHigh: Math.round(ftp * 0.9), pctLow: 76, pctHigh: 90 },
        { key: 'threshold', label: 'Schwelle', intensity: 'threshold', wattsLow: Math.round(ftp * 0.91), wattsHigh: Math.round(ftp * 1.05), pctLow: 91, pctHigh: 105 },
        { key: 'vo2', label: 'VO2', intensity: 'vo2', wattsLow: Math.round(ftp * 1.06), wattsHigh: Math.round(ftp * 1.2), pctLow: 106, pctHigh: 120 },
      ]
    : []

  // Fix duplicate wattsHigh I accidentally wrote - wait I have a syntax error
  return {
    ftpWatts: ftp,
    source,
    confidence,
    best20minWatts: best20 ? Math.round(best20) : null,
    best60minWatts: best60 ? Math.round(best60) : null,
    hasPower: withPower.length > 0,
    lthr,
    zones,
  }
}

function swimPacePer100(distanceM: number, timeSec: number): number {
  return (timeSec / distanceM) * 100
}

function analyzeSwim(activities: Activity[]): SwimFitness {
  const swims = activities.filter((a) => classifySport(a) === 'swim' && a.distance_m >= 200)
  const efforts: Array<{ d: number; t: number; pace: number; date: string }> = []

  for (const s of swims) {
    for (const lap of s.laps ?? []) {
      if (lap.distance >= 100 && lap.distance <= 1500 && lap.moving_time > 0) {
        const pace = swimPacePer100(lap.distance, lap.moving_time)
        if (pace > 55 && pace < 220) {
          efforts.push({ d: lap.distance, t: lap.moving_time, pace, date: s.start_date })
        }
      }
    }
    const pace = swimPacePer100(s.distance_m, s.moving_time_s)
    if (pace > 55 && pace < 200 && s.distance_m >= 400) {
      efforts.push({ d: s.distance_m, t: s.moving_time_s, pace, date: s.start_date })
    }
  }

  const near400 = efforts.filter((e) => e.d >= 350 && e.d <= 500).sort((a, b) => a.t - b.t)
  const near200 = efforts.filter((e) => e.d >= 180 && e.d <= 250).sort((a, b) => a.t - b.t)
  const best400 = near400[0]
  const best200 = near200[0]

  let css: number | null = null
  let source = 'Zu wenig Schwimmdaten — CSS-Test steht im Plan.'
  let needsTest = true
  let confidence: Confidence = 'none'

  if (best400 && best200 && best400.t > best200.t) {
    const mps = (best400.d - best200.d) / (best400.t - best200.t)
    css = 100 / mps
    source = `CSS aus 400 m (${Math.round(best400.t)} s) und 200 m (${Math.round(best200.t)} s)`
    needsTest = false
    confidence = 'high'
  } else {
    const quality = efforts.filter((e) => e.d >= 400 && e.d <= 1500).sort((a, b) => a.pace - b.pace)
    if (quality.length) {
      css = quality[0].pace * 1.03
      source = `Geschätzt aus bester ${Math.round(quality[0].d)} m-Lage (konservativ +3 %).`
      needsTest = quality.length < 3
      confidence = quality.length >= 3 ? 'medium' : 'low'
    }
  }

  const zones: PaceZone[] = css
    ? [
        { key: 'easy', label: 'Technik / Easy', intensity: 'easy', paceLowSec: Math.round(css * 1.08), paceHighSec: Math.round(css * 1.18), pctLow: 0, pctHigh: 90 },
        { key: 'css', label: 'CSS', intensity: 'threshold', paceSec: Math.round(css), pctLow: 98, pctHigh: 102 },
        { key: 'fast', label: 'schneller als CSS', intensity: 'vo2', paceLowSec: Math.round(css * 0.9), paceHighSec: Math.round(css * 0.96), pctLow: 104, pctHigh: 112 },
      ]
    : []

  return {
    cssSecPer100: css ? Math.round(css) : null,
    source,
    confidence,
    needsTest,
    best400Sec: best400?.t,
    best200Sec: best200?.t,
    zones,
  }
}

export function analyzeActivities(activities: Activity[]): FitnessSnapshot {
  const recent = activities.filter((a) => inWindow(a.start_date))
  const run = analyzeRun(recent)
  const bike = analyzeBike(recent)
  const swim = analyzeSwim(recent)

  const byWeek = new Map<string, number>()
  const sportHours = { swim: 0, bike: 0, run: 0 }
  for (const a of recent) {
    const week = new Date(a.start_date)
    week.setHours(0, 0, 0, 0)
    const day = (week.getDay() + 6) % 7
    week.setDate(week.getDate() - day)
    const key = week.toISOString().slice(0, 10)
    const h = hoursFromSeconds(a.moving_time_s)
    byWeek.set(key, (byWeek.get(key) ?? 0) + h)
    const s = classifySport(a)
    if (s === 'swim' || s === 'bike' || s === 'run') sportHours[s] += h
  }

  const weeks = Math.max(1, Math.min(WINDOW_WEEKS, byWeek.size || 1))
  const weeklyHours = [...byWeek.values()].length
    ? median([...byWeek.values()].filter((h) => h > 0.5))
    : 0

  const warnings: string[] = []
  if (run.confidence === 'none' || run.confidence === 'low') {
    warnings.push('Lauf-Schwelle unsicher. Ein 5-km-Test würde die Paces deutlich verbessern.')
  }
  if (!bike.hasPower) {
    warnings.push('Kein Powermeter — Rad-Einheiten nutzen Herzfrequenz oder RPE statt Watt.')
  } else if (bike.confidence === 'low' || bike.confidence === 'none') {
    warnings.push('FTP unsicher. Ein 20-Minuten-Test auf dem Rad wäre sinnvoll.')
  }
  if (swim.needsTest) {
    warnings.push('Schwimm-CSS unsicher. Woche 1 enthält einen 400/200-m-Test.')
  }
  if (weeklyHours < 2) {
    warnings.push('Sehr geringes aktuelles Volumen — der Plan startet konservativ.')
  }

  return {
    calculatedAt: new Date().toISOString(),
    windowWeeks: WINDOW_WEEKS,
    weeklyHours: Math.round(weeklyHours * 10) / 10,
    weeklyHoursBySport: {
      swim: Math.round((sportHours.swim / weeks) * 10) / 10,
      bike: Math.round((sportHours.bike / weeks) * 10) / 10,
      run: Math.round((sportHours.run / weeks) * 10) / 10,
    },
    run,
    bike,
    swim,
    warnings,
  }
}

export function zoneTarget(zone: PaceZone | undefined, kind: 'run' | 'bike' | 'swim'): string {
  if (!zone) return 'nach Gefühl'
  if (kind === 'bike') {
    if (zone.wattsLow && zone.wattsHigh) return `${zone.wattsLow}–${zone.wattsHigh} W`
    if (zone.watts) return `${zone.watts} W`
  }
  const unit = kind === 'swim' ? '/100 m' : '/km'
  if (zone.paceLowSec && zone.paceHighSec) {
    const fmt = (s: number) => {
      const m = Math.floor(s / 60)
      const sec = Math.round(s % 60)
      return `${m}:${String(sec).padStart(2, '0')}`
    }
    return `${fmt(zone.paceLowSec)}–${fmt(zone.paceHighSec)} ${unit}`
  }
  if (zone.paceSec) {
    const m = Math.floor(zone.paceSec / 60)
    const sec = Math.round(zone.paceSec % 60)
    return `${m}:${String(sec).padStart(2, '0')} ${unit}`
  }
  return 'nach Gefühl'
}
