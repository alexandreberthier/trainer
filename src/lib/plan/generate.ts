import type { FitnessSnapshot, Phase, PlannedWorkout, RaceDistance, Sport, TrainingPlan, WorkoutBlock } from '../types'
import { addDays, diffDays, isoDate, startOfWeekMonday, uid } from '../format'
import { zoneTarget } from '../fitness/analyze'

const RACE_LABEL: Record<RaceDistance, string> = {
  sprint: 'Sprint',
  olympic: 'Olympic',
  half: '70.3',
  ironman: 'Ironman',
}

const TAPER_DAYS: Record<RaceDistance, number> = {
  sprint: 10,
  olympic: 12,
  half: 16,
  ironman: 21,
}

const PEAK_DAYS: Record<RaceDistance, number> = {
  sprint: 21,
  olympic: 28,
  half: 28,
  ironman: 35,
}

const BUILD_DAYS: Record<RaceDistance, number> = {
  sprint: 42,
  olympic: 56,
  half: 63,
  ironman: 70,
}

const PEAK_HOURS: Record<RaceDistance, number> = {
  sprint: 7,
  olympic: 9,
  half: 12,
  ironman: 16,
}

function phaseFor(daysToRace: number, race: RaceDistance): Phase {
  if (daysToRace <= TAPER_DAYS[race]) return 'taper'
  if (daysToRace <= TAPER_DAYS[race] + PEAK_DAYS[race]) return 'peak'
  if (daysToRace <= TAPER_DAYS[race] + PEAK_DAYS[race] + BUILD_DAYS[race]) return 'build'
  return 'base'
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function hoursForWeek(weekIndex: number, weekCount: number, start: number, peak: number, race: RaceDistance): number {
  const taperWeeks = Math.ceil(TAPER_DAYS[race] / 7)
  const weeksFromEnd = weekCount - 1 - weekIndex
  if (weeksFromEnd < taperWeeks) {
    const t = (weeksFromEnd + 1) / taperWeeks
    return round1(peak * (0.45 + 0.2 * t))
  }
  const loadWeeks = Math.max(1, weekCount - taperWeeks)
  const progress = weekIndex / loadWeeks
  const recovery = (weekIndex + 1) % 4 === 0
  const base = start + (peak - start) * ease(progress)
  return round1(recovery ? base * 0.72 : base)
}

function ease(t: number): number {
  return 1 - (1 - clamp(t, 0, 1)) ** 1.4
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function findZone(fitness: FitnessSnapshot, sport: 'run' | 'bike' | 'swim', key: string) {
  const set = sport === 'run' ? fitness.run.zones : sport === 'bike' ? fitness.bike.zones : fitness.swim.zones
  return set.find((z) => z.key === key) ?? set[0]
}

function target(fitness: FitnessSnapshot, sport: 'run' | 'bike' | 'swim', key: string): string {
  return zoneTarget(findZone(fitness, sport, key), sport)
}

function block(partial: Omit<WorkoutBlock, 'id'>): WorkoutBlock {
  return { id: uid('blk'), ...partial }
}

function workout(partial: Omit<PlannedWorkout, 'id'>): PlannedWorkout {
  return { id: uid('wo'), ...partial }
}

interface DaySpec {
  weekday: number
  sport: Sport
  kind: string
}

function weekTemplate(phase: Phase, race: RaceDistance, available: number[]): DaySpec[] {
  const pick = (...candidates: number[]) => candidates.find((d) => available.includes(d)) ?? available[0] ?? 0

  const rest = available.length >= 6 ? [pick(6)] : []
  const days: DaySpec[] = []

  const swimTech = pick(0)
  const bikeHard = pick(2)
  const runHard = pick(4)
  const longBike = pick(5)
  const swim2 = pick(3, 1)
  const runEasy = pick(1, 3)

  days.push({ weekday: swimTech, sport: 'swim', kind: phase === 'base' || fitnessNeedsSwimTest(phase) ? 'swim-test-or-tech' : 'swim-css' })
  days.push({ weekday: runEasy, sport: 'run', kind: 'run-easy' })
  days.push({ weekday: bikeHard, sport: 'bike', kind: phase === 'base' ? 'bike-endurance' : 'bike-hard' })
  if (swim2 !== swimTech) days.push({ weekday: swim2, sport: 'swim', kind: 'swim-endurance' })
  days.push({ weekday: runHard, sport: 'run', kind: phase === 'taper' ? 'run-sharp' : phase === 'base' ? 'run-strides' : 'run-hard' })
  days.push({
    weekday: longBike,
    sport: phase === 'peak' || phase === 'build' ? 'brick' : 'bike',
    kind: phase === 'peak' || phase === 'build' ? 'brick' : 'bike-long',
  })

  if (race === 'half' || race === 'ironman') {
    const longRun = pick(6, 1)
    if (!days.some((d) => d.weekday === longRun)) {
      days.push({ weekday: longRun, sport: 'run', kind: phase === 'taper' ? 'run-easy' : 'run-long' })
    }
  }

  // Strength once in base/build if a free day exists
  if (phase === 'base' || phase === 'build') {
    const used = new Set(days.map((d) => d.weekday))
    const free = available.find((d) => !used.has(d) && !rest.includes(d))
    if (free != null) days.push({ weekday: free, sport: 'strength', kind: 'strength' })
  }

  return dedupeDays(days)
}

function fitnessNeedsSwimTest(phase: Phase): boolean {
  return phase === 'base'
}

function dedupeDays(days: DaySpec[]): DaySpec[] {
  const map = new Map<number, DaySpec>()
  for (const d of days) {
    if (!map.has(d.weekday)) map.set(d.weekday, d)
  }
  return [...map.values()]
}

function scaleDuration(baseMin: number, weekHours: number, peakHours: number): number {
  const factor = clamp(weekHours / Math.max(4, peakHours), 0.55, 1.15)
  return Math.round(baseMin * factor)
}

function buildSession(
  spec: DaySpec,
  date: string,
  phase: Phase,
  weekHours: number,
  peakHours: number,
  weekInPhase: number,
  fitness: FitnessSnapshot,
  race: RaceDistance,
  isFirstWeek: boolean,
): PlannedWorkout {
  const easyRun = target(fitness, 'run', 'easy')
  const thRun = target(fitness, 'run', 'threshold')
  const vo2Run = target(fitness, 'run', 'vo2')
  const easyBike = target(fitness, 'bike', 'endurance')
  const thBike = target(fitness, 'bike', 'threshold')
  const vo2Bike = target(fitness, 'bike', 'vo2')
  const css = target(fitness, 'swim', 'css')
  const easySwim = target(fitness, 'swim', 'easy')
  const fastSwim = target(fitness, 'swim', 'fast')

  const reps = 3 + Math.min(3, weekInPhase)

  const kind =
    spec.kind === 'swim-test-or-tech'
      ? isFirstWeek && fitness.swim.needsTest
        ? 'swim-test'
        : 'swim-css'
      : spec.kind

  switch (kind) {
    case 'swim-test':
      return workout({
        date,
        sport: 'swim',
        title: 'CSS-Test',
        phase,
        intensity: 'test',
        durationMin: 40,
        description: '400 m und 200 m möglichst gleichmäßig all-out, 8–10 min locker dazwischen. Daraus wird die Schwimm-Schwelle berechnet.',
        structure: [
          block({ label: 'Einschwimmen', durationMin: 10, target: easySwim, intensity: 'easy' }),
          block({ label: '400 m Test', distanceM: 400, target: 'maximal gleichmäßig', intensity: 'test' }),
          block({ label: 'Pause locker', durationMin: 10, target: easySwim, intensity: 'recovery' }),
          block({ label: '200 m Test', distanceM: 200, target: 'maximal gleichmäßig', intensity: 'test' }),
          block({ label: 'Ausschwimmen', durationMin: 8, target: easySwim, intensity: 'easy' }),
        ],
      })
    case 'swim-css':
      return workout({
        date,
        sport: 'swim',
        title: 'CSS-Intervalle',
        phase,
        intensity: 'threshold',
        durationMin: scaleDuration(50, weekHours, peakHours),
        description: `${reps}× 200 m an der Schwelle (${css}), kurze Pause. Ziel: Tempo halten ohne zu zerfallen.`,
        structure: [
          block({ label: 'Einschwimmen', durationMin: 10, target: easySwim, intensity: 'easy' }),
          block({
            label: `${reps}× 200 m CSS`,
            repeats: reps,
            steps: [
              { label: '200 m CSS', distanceM: 200, target: css, intensity: 'threshold' },
              { label: '20 s Pause', durationMin: 0.3, target: 'Pause', intensity: 'recovery' },
            ],
            target: css,
            intensity: 'threshold',
          }),
          block({ label: 'Ausschwimmen', durationMin: 8, target: easySwim, intensity: 'easy' }),
        ],
      })
    case 'swim-endurance':
      return workout({
        date,
        sport: 'swim',
        title: phase === 'base' ? 'Technik & Ausdauer' : 'Schwimm-Ausdauer',
        phase,
        intensity: 'easy',
        durationMin: scaleDuration(45, weekHours, peakHours),
        description: 'Locker, lange Lagen, Technik. Wenn CSS feststeht, 4× 50 m etwas flotter einstreuen.',
        structure: [
          block({ label: 'Technik', durationMin: 12, target: easySwim, intensity: 'easy' }),
          block({ label: 'Hauptlage', durationMin: 20, target: easySwim, intensity: 'easy' }),
          block({ label: '4× 50 m flott', repeats: 4, target: fastSwim, intensity: 'steady' }),
          block({ label: 'Ausschwimmen', durationMin: 6, target: easySwim, intensity: 'easy' }),
        ],
      })
    case 'bike-hard': {
      const vo2 = phase === 'peak' || (phase === 'build' && weekInPhase % 2 === 1)
      return workout({
        date,
        sport: 'bike',
        title: vo2 ? 'Rad VO2' : 'Rad Schwelle',
        phase,
        intensity: vo2 ? 'vo2' : 'threshold',
        durationMin: scaleDuration(vo2 ? 55 : 70, weekHours, peakHours),
        description: vo2
          ? `${Math.min(6, 3 + weekInPhase)}× 3 min hart (${vo2Bike}), 3 min locker.`
          : `${Math.min(4, 2 + Math.floor(weekInPhase / 2))}× 12 min bei ${thBike}, 4 min locker.`,
        structure: vo2
          ? [
              block({ label: 'Einrollen', durationMin: 15, target: easyBike, intensity: 'easy' }),
              block({
                label: 'VO2-Intervalle',
                repeats: Math.min(6, 3 + weekInPhase),
                steps: [
                  { label: '3 min hart', durationMin: 3, target: vo2Bike, intensity: 'vo2' },
                  { label: '3 min locker', durationMin: 3, target: easyBike, intensity: 'recovery' },
                ],
                target: vo2Bike,
                intensity: 'vo2',
              }),
              block({ label: 'Ausrollen', durationMin: 10, target: easyBike, intensity: 'easy' }),
            ]
          : [
              block({ label: 'Einrollen', durationMin: 15, target: easyBike, intensity: 'easy' }),
              block({
                label: 'Schwellen-Blöcke',
                repeats: Math.min(4, 2 + Math.floor(weekInPhase / 2)),
                steps: [
                  { label: '12 min Schwelle', durationMin: 12, target: thBike, intensity: 'threshold' },
                  { label: '4 min locker', durationMin: 4, target: easyBike, intensity: 'recovery' },
                ],
                target: thBike,
                intensity: 'threshold',
              }),
              block({ label: 'Ausrollen', durationMin: 10, target: easyBike, intensity: 'easy' }),
            ],
      })
    }
    case 'bike-endurance':
    case 'bike-long':
      return workout({
        date,
        sport: 'bike',
        title: kind === 'bike-long' ? 'Langer Radausflug' : 'Rad Ausdauer',
        phase,
        intensity: 'easy',
        durationMin: scaleDuration(kind === 'bike-long' ? (race === 'ironman' ? 180 : race === 'half' ? 150 : 90) : 60, weekHours, peakHours),
        description: `Im Ausdauerbereich (${easyBike}). Trittfrequenz 85–95, Gesprächspace.`,
        structure: [
          block({ label: 'Ganze Fahrt Z2', durationMin: scaleDuration(kind === 'bike-long' ? 90 : 60, weekHours, peakHours), target: easyBike, intensity: 'easy' }),
        ],
      })
    case 'run-easy':
      return workout({
        date,
        sport: 'run',
        title: 'Dauerlauf Easy',
        phase,
        intensity: 'easy',
        durationMin: scaleDuration(phase === 'taper' ? 35 : 50, weekHours, peakHours),
        description: `Locker ${easyRun}. Wenn du in Sätze kommst, bist du zu schnell.`,
        structure: [
          block({ label: 'Easy', durationMin: scaleDuration(50, weekHours, peakHours), target: easyRun, intensity: 'easy' }),
          block({ label: '4 Steigerungen', durationMin: 4, target: '20 s schnell / 40 s traben', intensity: 'steady' }),
        ],
      })
    case 'run-long':
      return workout({
        date,
        sport: 'run',
        title: 'Langer Lauf',
        phase,
        intensity: 'easy',
        durationMin: scaleDuration(race === 'ironman' ? 120 : 90, weekHours, peakHours),
        description: `Überwiegend Easy (${easyRun}). Letztes Viertel darf Richtung Steady gehen.`,
        structure: [block({ label: 'Langer Lauf', durationMin: scaleDuration(90, weekHours, peakHours), target: easyRun, intensity: 'easy' })],
      })
    case 'run-strides':
      return workout({
        date,
        sport: 'run',
        title: 'Easy + Steigerungen',
        phase,
        intensity: 'easy',
        durationMin: scaleDuration(45, weekHours, peakHours),
        description: 'Grundlagen plus 6 kurze Steigerungen für die Laufökonomie.',
        structure: [
          block({ label: 'Easy', durationMin: 35, target: easyRun, intensity: 'easy' }),
          block({ label: '6× 20 s Steigerung', durationMin: 8, target: 'schnell, locker', intensity: 'steady' }),
        ],
      })
    case 'run-sharp':
      return workout({
        date,
        sport: 'run',
        title: 'Kurze Schärfe',
        phase,
        intensity: 'vo2',
        durationMin: 40,
        description: `Wenige Intervalle bei ${vo2Run}, damit das Tempo nicht verloren geht.`,
        structure: [
          block({ label: 'Einlaufen', durationMin: 15, target: easyRun, intensity: 'easy' }),
          block({
            label: '4× 2 min',
            repeats: 4,
            steps: [
              { label: '2 min flott', durationMin: 2, target: vo2Run, intensity: 'vo2' },
              { label: '2 min Trab', durationMin: 2, target: easyRun, intensity: 'recovery' },
            ],
            target: vo2Run,
            intensity: 'vo2',
          }),
          block({ label: 'Auslaufen', durationMin: 10, target: easyRun, intensity: 'easy' }),
        ],
      })
    case 'run-hard': {
      const th = phase === 'build' && weekInPhase % 2 === 0
      return workout({
        date,
        sport: 'run',
        title: th ? 'Tempolauf Schwelle' : 'VO2-Intervalle',
        phase,
        intensity: th ? 'threshold' : 'vo2',
        durationMin: scaleDuration(55, weekHours, peakHours),
        description: th
          ? `${Math.min(5, 3 + Math.floor(weekInPhase / 2))}× 5 min bei ${thRun}, 90 s Trabpause.`
          : `${Math.min(6, 4 + weekInPhase)}× 3 min bei ${vo2Run}, 90 s Trabpause.`,
        structure: [
          block({ label: 'Einlaufen', durationMin: 12, target: easyRun, intensity: 'easy' }),
          block({
            label: th ? 'Schwellen-Blöcke' : 'VO2-Intervalle',
            repeats: th ? Math.min(5, 3 + Math.floor(weekInPhase / 2)) : Math.min(6, 4 + weekInPhase),
            steps: [
              { label: th ? '5 min Schwelle' : '3 min VO2', durationMin: th ? 5 : 3, target: th ? thRun : vo2Run, intensity: th ? 'threshold' : 'vo2' },
              { label: '90 s Trab', durationMin: 1.5, target: easyRun, intensity: 'recovery' },
            ],
            target: th ? thRun : vo2Run,
            intensity: th ? 'threshold' : 'vo2',
          }),
          block({ label: 'Auslaufen', durationMin: 10, target: easyRun, intensity: 'easy' }),
        ],
      })
    }
    case 'brick':
      return workout({
        date,
        sport: 'brick',
        title: 'Brick Rad + Lauf',
        phase,
        intensity: phase === 'peak' ? 'steady' : 'easy',
        durationMin: scaleDuration(phase === 'peak' ? 110 : 90, weekHours, peakHours),
        description: `Rad im Ausdauer-/Steady-Bereich, direkt danach 15–25 min Laufen. Wechsel unter 3 min.`,
        structure: [
          block({ label: 'Rad', durationMin: scaleDuration(70, weekHours, peakHours), target: phase === 'peak' ? target(fitness, 'bike', 'tempo') : easyBike, intensity: phase === 'peak' ? 'steady' : 'easy' }),
          block({ label: 'Wechsel', durationMin: 3, target: 'schnell rumziehen', intensity: 'steady' }),
          block({ label: 'Lauf', durationMin: phase === 'peak' ? 25 : 15, target: phase === 'peak' ? thRun : easyRun, intensity: phase === 'peak' ? 'steady' : 'easy' }),
        ],
      })
    case 'strength':
      return workout({
        date,
        sport: 'strength',
        title: 'Kraft (40 min)',
        phase,
        intensity: 'easy',
        durationMin: 40,
        description: 'Kniebeuge, Hip Thinge, Ausfallschritte, Rumpf, Zug. 3 Sätze, nicht bis zum Muskelversagen.',
        structure: [
          block({ label: 'Warm-up', durationMin: 8, target: 'Mobilisation', intensity: 'easy' }),
          block({ label: 'Hauptteil', durationMin: 25, target: '3× 6–8 Wiederholungen', intensity: 'steady' }),
          block({ label: 'Rumpf', durationMin: 7, target: 'Plank / Side Plank', intensity: 'easy' }),
        ],
      })
    default:
      return workout({
        date,
        sport: spec.sport,
        title: 'Training',
        phase,
        intensity: 'easy',
        durationMin: 45,
        description: '',
        structure: [],
      })
  }
}

function raceDayWorkout(date: string, race: RaceDistance): PlannedWorkout {
  return workout({
    date,
    sport: 'brick',
    title: `Wettkampf ${RACE_LABEL[race]}`,
    phase: 'taper',
    intensity: 'race',
    durationMin: race === 'sprint' ? 90 : race === 'olympic' ? 180 : race === 'half' ? 360 : 720,
    description: 'Wettkampftag. Nichts Neues, früh frühstücken, der Plan hat dich hierher gebracht.',
    structure: [
      block({ label: 'Schwimmen', target: 'Wettkampfpace', intensity: 'race' }),
      block({ label: 'Rad', target: 'Wettkampfpace', intensity: 'race' }),
      block({ label: 'Laufen', target: 'Wettkampfpace', intensity: 'race' }),
    ],
  })
}

export function generatePlan(options: {
  raceType: RaceDistance
  raceDate: string
  weeklyHoursTarget: number
  availableDays: number[]
  fitness: FitnessSnapshot
  startDate?: string
}): TrainingPlan {
  const today = options.startDate ?? isoDate(new Date())
  const startMonday = startOfWeekMonday(today)
  const race = options.raceType
  const raceDate = options.raceDate
  const available = options.availableDays.length ? [...options.availableDays].sort() : [0, 1, 2, 3, 4, 5]

  const totalDays = Math.max(21, diffDays(startMonday, raceDate) + 1)
  const weekCount = Math.ceil(totalDays / 7)

  const current = Math.max(3, options.fitness.weeklyHours || 4)
  const peakCap = Math.min(PEAK_HOURS[race], options.weeklyHoursTarget || PEAK_HOURS[race])
  const startHours = Math.min(current, peakCap)
  const peakHours = Math.max(startHours, Math.min(peakCap, startHours + (peakCap - startHours)))

  const workouts: PlannedWorkout[] = []
  const phaseWeekCounter: Record<Phase, number> = { base: 0, build: 0, peak: 0, taper: 0 }
  let lastPhase: Phase | null = null

  for (let w = 0; w < weekCount; w++) {
    const weekStart = addDays(startMonday, w * 7)
    const midWeek = addDays(weekStart, 3)
    const daysToRace = diffDays(midWeek, raceDate)
    const phase = phaseFor(Math.max(0, daysToRace), race)
    if (phase !== lastPhase) {
      if (lastPhase) phaseWeekCounter[phase] = 0
      lastPhase = phase
    } else {
      phaseWeekCounter[phase] += 1
    }

    const hours = hoursForWeek(w, weekCount, startHours, peakHours, race)
    const specs = weekTemplate(phase, race, available)

    for (const spec of specs) {
      const date = addDays(weekStart, spec.weekday)
      if (date > raceDate) continue
      if (date === raceDate) continue
      workouts.push(
        buildSession(spec, date, phase, hours, peakHours, phaseWeekCounter[phase], options.fitness, race, w === 0),
      )
    }
  }

  workouts.push(raceDayWorkout(raceDate, race))
  workouts.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title))

  return {
    id: uid('plan'),
    startDate: startMonday,
    raceDate,
    raceType: race,
    weeklyHoursStart: startHours,
    weeklyHoursPeak: peakHours,
    workouts,
  }
}

export function workoutsOn(plan: TrainingPlan | null, date: string): PlannedWorkout[] {
  if (!plan) return []
  return plan.workouts.filter((w) => w.date === date)
}

export function weekWorkouts(plan: TrainingPlan | null, dateInWeek: string): PlannedWorkout[] {
  if (!plan) return []
  const start = startOfWeekMonday(dateInWeek)
  const end = addDays(start, 6)
  return plan.workouts.filter((w) => w.date >= start && w.date <= end)
}

export { RACE_LABEL }
