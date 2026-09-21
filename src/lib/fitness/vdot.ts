/**
 * Jack Daniels VDOT.
 * Velocity V in meters / minute.
 * VO2 = -4.60 + 0.182258 V + 0.000104 V²
 * %VO2max(T minutes) = 0.8 + 0.1894393 e^(-0.012778 T) + 0.2989558 e^(-0.1932605 T)
 */

export function oxygenCost(velocityMPerMin: number): number {
  return -4.6 + 0.182258 * velocityMPerMin + 0.000104 * velocityMPerMin * velocityMPerMin
}

export function percentVo2max(durationMin: number): number {
  return (
    0.8 +
    0.1894393 * Math.exp(-0.012778 * durationMin) +
    0.2989558 * Math.exp(-0.1932605 * durationMin)
  )
}

export function vdotFromRace(distanceM: number, timeSec: number): number {
  if (distanceM <= 0 || timeSec <= 0) return 0
  const tMin = timeSec / 60
  const v = distanceM / tMin
  return oxygenCost(v) / percentVo2max(tMin)
}

/** Invert oxygen-cost quadratic → velocity m/min */
export function velocityFromVo2(vo2: number): number {
  const a = 0.000104
  const b = 0.182258
  const c = -4.6 - vo2
  const disc = b * b - 4 * a * c
  if (disc < 0) return 0
  return (-b + Math.sqrt(disc)) / (2 * a)
}

/** Pace at a given % of VDOT, as seconds / km */
export function paceSecPerKmFromVdot(vdot: number, intensityPct: number): number {
  const vo2 = vdot * intensityPct
  const v = velocityFromVo2(vo2) // m/min
  if (v <= 0) return 0
  return (1000 / v) * 60
}

export const VDOT_INTENSITIES = {
  easyLow: 0.59,
  easyHigh: 0.74,
  marathon: 0.8,
  threshold: 0.88,
  interval: 0.975,
  repetition: 1.07,
} as const

export function equivalentRaceTime(vdot: number, distanceM: number): number {
  // binary search time such that vdotFromRace matches
  let lo = 60
  let hi = 36_000
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    const v = vdotFromRace(distanceM, mid)
    if (v > vdot) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

export const BEST_EFFORT_DISTANCES: Record<string, number> = {
  '400m': 400,
  '800m': 800,
  '1k': 1000,
  '1 mile': 1609.34,
  '2 mile': 3218.69,
  '5k': 5000,
  '10k': 10000,
  '15k': 15000,
  '10 mile': 16093.4,
  '20k': 20000,
  'Half-Marathon': 21097.5,
  Marathon: 42195,
}

export function distanceForEffortName(name: string, fallback: number): number {
  const key = Object.keys(BEST_EFFORT_DISTANCES).find((k) => k.toLowerCase() === name.toLowerCase())
  return key ? BEST_EFFORT_DISTANCES[key] : fallback
}
