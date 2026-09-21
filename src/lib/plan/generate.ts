import type { FitnessSnapshot, Phase, PlannedWorkout, RaceDistance, Sport, TrainableSport, TrainingPlan, WorkoutBlock } from '../types'
import { addDays, diffDays, isoDate, startOfWeekMonday, uid } from '../format'
import { zoneTarget } from '../fitness/analyze'
import { structureTotal } from '../workout-graph'

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

function weekTemplate(phase: Phase, race: RaceDistance, available: number[], sports: TrainableSport[]): DaySpec[] {
  const has = (sport: TrainableSport) => sports.includes(sport)
  const used = new Set<number>()
  const take = (...candidates: number[]) => {
    const hit =
      candidates.find((d) => available.includes(d) && !used.has(d)) ?? available.find((d) => !used.has(d))
    if (hit == null) return null
    used.add(hit)
    return hit
  }

  const days: DaySpec[] = []
  const runOnly = has('run') && !has('bike') && !has('swim')

  if (has('swim')) {
    const first = take(0, 2, 3)
    if (first != null) {
      days.push({
        weekday: first,
        sport: 'swim',
        kind: phase === 'base' ? 'swim-test-or-tech' : 'swim-css',
      })
    }
    const second = take(3, 1, 4)
    if (second != null) days.push({ weekday: second, sport: 'swim', kind: 'swim-endurance' })
  }

  if (has('run')) {
    const easy = take(1, 3, 0)
    if (easy != null) days.push({ weekday: easy, sport: 'run', kind: 'run-easy' })
    const hard = take(4, 2, 1)
    if (hard != null) {
      days.push({
        weekday: hard,
        sport: 'run',
        kind: phase === 'taper' ? 'run-sharp' : phase === 'base' ? 'run-strides' : 'run-hard',
      })
    }
    const longRun = take(6, 5, 0)
    if (longRun != null && (runOnly || race === 'half' || race === 'ironman' || !has('bike'))) {
      days.push({ weekday: longRun, sport: 'run', kind: phase === 'taper' ? 'run-easy' : 'run-long' })
    }
    if (runOnly) {
      const extra = take(2, 3, 5)
      if (extra != null) days.push({ weekday: extra, sport: 'run', kind: phase === 'base' ? 'run-easy' : 'run-strides' })
    }
  }

  if (has('bike')) {
    const quality = take(2, 3, 1)
    if (quality != null) {
      days.push({
        weekday: quality,
        sport: 'bike',
        kind: phase === 'base' ? 'bike-endurance' : 'bike-hard',
      })
    }
    const longRide = take(5, 6, 4)
    if (longRide != null) {
      const brick = has('run') && (phase === 'peak' || phase === 'build')
      days.push({
        weekday: longRide,
        sport: brick ? 'brick' : 'bike',
        kind: brick ? 'brick' : 'bike-long',
      })
    }
  }

  if (has('strength') && (phase === 'base' || phase === 'build')) {
    const free = take(3, 1, 6, 0, 2, 4, 5)
    if (free != null) days.push({ weekday: free, sport: 'strength', kind: 'strength' })
  }

  return days
}

function scaleDuration(baseMin: number, weekHours: number, peakHours: number): number {
  const factor = clamp(weekHours / Math.max(5, peakHours), 0.85, 1.2)
  return Math.round(baseMin * factor)
}

function syncDuration(w: PlannedWorkout): PlannedWorkout {
  const total = Math.round(structureTotal(w))
  if (total > 0) w.durationMin = total
  return w
}

function scaleEasyBlocks(w: PlannedWorkout, factor: number) {
  for (const block of w.structure) {
    if (block.intensity === 'easy' && block.durationMin && block.durationMin >= 8) {
      block.durationMin = Math.round(block.durationMin * factor)
    }
  }
  syncDuration(w)
}

function fitWeekHours(sessions: PlannedWorkout[], weekHours: number) {
  if (!sessions.length) return
  for (const session of sessions) syncDuration(session)
  const target = weekHours * 60
  const current = sessions.reduce((sum, session) => sum + session.durationMin, 0)
  if (current < 1 || current >= target * 0.92) return
  let easyPool = 0
  for (const session of sessions) {
    for (const block of session.structure) {
      if (block.intensity === 'easy' && block.durationMin && block.durationMin >= 8) {
        easyPool += block.durationMin
      }
    }
  }
  if (easyPool < 10) return
  const factor = Math.min(2.3, (easyPool + (target - current)) / easyPool)
  for (const session of sessions) scaleEasyBlocks(session, factor)
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
      return syncDuration(
        workout({
          date,
          sport: 'swim',
          title: 'CSS-Test',
          phase,
          intensity: 'test',
          durationMin: 45,
          description: '400 m und 200 m möglichst gleichmäßig all-out, 8–10 min locker dazwischen. Daraus wird die Schwimm-Schwelle berechnet.',
          structure: [
            block({ label: 'Einschwimmen', durationMin: 12, target: easySwim, intensity: 'easy' }),
            block({ label: '400 m Test', durationMin: 8, distanceM: 400, target: 'maximal gleichmäßig', intensity: 'test' }),
            block({ label: 'Pause locker', durationMin: 10, target: easySwim, intensity: 'recovery' }),
            block({ label: '200 m Test', durationMin: 4, distanceM: 200, target: 'maximal gleichmäßig', intensity: 'test' }),
            block({ label: 'Ausschwimmen', durationMin: 8, target: easySwim, intensity: 'easy' }),
          ],
        }),
      )
    case 'swim-css':
      return syncDuration(
        workout({
          date,
          sport: 'swim',
          title: 'CSS-Intervalle',
          phase,
          intensity: 'threshold',
          durationMin: scaleDuration(55, weekHours, peakHours),
          description: `${reps}× 200 m bei ${css}, dazwischen 20–30 s Pause. Tempo soll über alle Wiederholungen gleich bleiben.`,
          structure: [
            block({ label: 'Einschwimmen', durationMin: 12, target: easySwim, intensity: 'easy' }),
            block({
              label: `${reps}× 200 m CSS`,
              repeats: reps,
              steps: [
                { label: '200 m CSS', durationMin: 5, distanceM: 200, target: css, intensity: 'threshold' },
                { label: 'Pause an der Wand', durationMin: 0.4, target: '20–30 s stehen', intensity: 'recovery' },
              ],
              target: css,
              intensity: 'threshold',
            }),
            block({ label: 'Ausschwimmen', durationMin: 8, target: easySwim, intensity: 'easy' }),
          ],
        }),
      )
    case 'swim-endurance':
      return syncDuration(
        workout({
          date,
          sport: 'swim',
          title: phase === 'base' ? 'Technik & Ausdauer' : 'Schwimm-Ausdauer',
          phase,
          intensity: 'easy',
          durationMin: scaleDuration(50, weekHours, peakHours),
          description: `Locker bei ${easySwim}. Lange Lagen, saubere Technik. Zum Schluss 4× 50 m etwas flotter.`,
          structure: [
            block({ label: 'Technik / Einschwimmen', durationMin: 12, target: easySwim, intensity: 'easy' }),
            block({ label: 'Hauptlage', durationMin: 24, target: easySwim, intensity: 'easy' }),
            block({
              label: '4× 50 m flott',
              repeats: 4,
              steps: [
                { label: '50 m flott', durationMin: 1.2, distanceM: 50, target: fastSwim, intensity: 'steady' },
                { label: '15 s Pause', durationMin: 0.25, target: 'kurz stehen', intensity: 'recovery' },
              ],
              target: fastSwim,
              intensity: 'steady',
            }),
            block({ label: 'Ausschwimmen', durationMin: 8, target: easySwim, intensity: 'easy' }),
          ],
        }),
      )
    case 'bike-hard': {
      const vo2 = phase === 'peak' || (phase === 'build' && weekInPhase % 2 === 1)
      const vo2Reps = Math.min(6, 4 + Math.floor(weekInPhase / 2))
      const thReps = Math.min(4, 2 + Math.floor(weekInPhase / 2))
      return syncDuration(
        workout({
          date,
          sport: 'bike',
          title: vo2 ? 'Rad VO2' : 'Rad Schwelle',
          phase,
          intensity: vo2 ? 'vo2' : 'threshold',
          durationMin: scaleDuration(vo2 ? 75 : 90, weekHours, peakHours),
          description: vo2
            ? `${vo2Reps}× 3 min bei ${vo2Bike}, jeweils 3 min locker dazwischen.`
            : `${thReps}× 12 min bei ${thBike}, jeweils 4 min locker dazwischen.`,
          structure: vo2
            ? [
                block({ label: 'Einrollen', durationMin: 18, target: easyBike, intensity: 'easy' }),
                block({
                  label: `${vo2Reps}× 3 min VO2`,
                  repeats: vo2Reps,
                  steps: [
                    { label: '3 min hart', durationMin: 3, target: vo2Bike, intensity: 'vo2' },
                    { label: '3 min locker', durationMin: 3, target: easyBike, intensity: 'recovery' },
                  ],
                  target: vo2Bike,
                  intensity: 'vo2',
                }),
                block({ label: 'Ausrollen', durationMin: 12, target: easyBike, intensity: 'easy' }),
              ]
            : [
                block({ label: 'Einrollen', durationMin: 18, target: easyBike, intensity: 'easy' }),
                block({
                  label: `${thReps}× 12 min Schwelle`,
                  repeats: thReps,
                  steps: [
                    { label: '12 min Schwelle', durationMin: 12, target: thBike, intensity: 'threshold' },
                    { label: '4 min locker', durationMin: 4, target: easyBike, intensity: 'recovery' },
                  ],
                  target: thBike,
                  intensity: 'threshold',
                }),
                block({ label: 'Ausrollen', durationMin: 12, target: easyBike, intensity: 'easy' }),
              ],
        }),
      )
    }
    case 'bike-endurance':
    case 'bike-long': {
      const longRide = kind === 'bike-long'
      const main = longRide ? (race === 'ironman' ? 150 : race === 'half' ? 120 : 90) : 70
      return syncDuration(
        workout({
          date,
          sport: 'bike',
          title: longRide ? 'Langer Radausflug' : 'Rad Ausdauer',
          phase,
          intensity: 'easy',
          durationMin: scaleDuration(main + 25, weekHours, peakHours),
          description: `Im Ausdauerbereich (${easyBike}). Trittfrequenz 85–95. Du solltest noch reden können — wenn du keuchst, zu hart.`,
          structure: [
            block({ label: 'Einrollen', durationMin: 12, target: easyBike, intensity: 'easy' }),
            block({ label: 'Hauptteil Z2', durationMin: scaleDuration(main, weekHours, peakHours), target: easyBike, intensity: 'easy' }),
            block({ label: 'Ausrollen', durationMin: 10, target: easyBike, intensity: 'easy' }),
          ],
        }),
      )
    }
    case 'run-easy':
      return syncDuration(
        workout({
          date,
          sport: 'run',
          title: 'Dauerlauf Easy',
          phase,
          intensity: 'easy',
          durationMin: scaleDuration(phase === 'taper' ? 45 : 65, weekHours, peakHours),
          description: `Locker bei ${easyRun}. Du solltest noch in ganzen Sätzen sprechen können. Wenn du keuchst, bist du zu schnell.`,
          structure: [
            block({ label: 'Einlaufen', durationMin: 10, target: easyRun, intensity: 'easy' }),
            block({
              label: 'Dauerlauf',
              durationMin: scaleDuration(phase === 'taper' ? 25 : 45, weekHours, peakHours),
              target: easyRun,
              intensity: 'easy',
            }),
            block({
              label: '4 Steigerungen',
              repeats: 4,
              steps: [
                { label: '20 s schnell', durationMin: 0.35, target: 'locker beschleunigen', intensity: 'steady' },
                { label: '40 s traben', durationMin: 0.7, target: easyRun, intensity: 'recovery' },
              ],
              target: '20 s schnell / 40 s traben',
              intensity: 'steady',
            }),
            block({ label: 'Auslaufen', durationMin: 8, target: easyRun, intensity: 'easy' }),
          ],
        }),
      )
    case 'run-long':
      return syncDuration(
        workout({
          date,
          sport: 'run',
          title: 'Langer Lauf',
          phase,
          intensity: 'easy',
          durationMin: scaleDuration(race === 'ironman' ? 130 : 90, weekHours, peakHours),
          description: `Überwiegend Easy (${easyRun}). Letztes Viertel darf etwas flotter werden, aber du solltest noch sprechen können.`,
          structure: [
            block({ label: 'Einlaufen', durationMin: 12, target: easyRun, intensity: 'easy' }),
            block({
              label: 'Hauptteil',
              durationMin: scaleDuration(race === 'ironman' ? 100 : 65, weekHours, peakHours),
              target: easyRun,
              intensity: 'easy',
            }),
            block({ label: 'Auslaufen', durationMin: 10, target: easyRun, intensity: 'easy' }),
          ],
        }),
      )
    case 'run-strides':
      return syncDuration(
        workout({
          date,
          sport: 'run',
          title: 'Easy + Steigerungen',
          phase,
          intensity: 'easy',
          durationMin: scaleDuration(55, weekHours, peakHours),
          description: `Grundlagen bei ${easyRun}, danach 6 kurze Steigerungen für die Laufökonomie.`,
          structure: [
            block({ label: 'Einlaufen', durationMin: 10, target: easyRun, intensity: 'easy' }),
            block({ label: 'Dauerlauf', durationMin: 30, target: easyRun, intensity: 'easy' }),
            block({
              label: '6 Steigerungen',
              repeats: 6,
              steps: [
                { label: '20 s Steigerung', durationMin: 0.35, target: 'schnell, locker', intensity: 'steady' },
                { label: '40 s traben', durationMin: 0.7, target: easyRun, intensity: 'recovery' },
              ],
              target: '20 s schnell / 40 s traben',
              intensity: 'steady',
            }),
            block({ label: 'Auslaufen', durationMin: 8, target: easyRun, intensity: 'easy' }),
          ],
        }),
      )
    case 'run-sharp':
      return syncDuration(
        workout({
          date,
          sport: 'run',
          title: 'Kurze Schärfe',
          phase,
          intensity: 'vo2',
          durationMin: 50,
          description: `Wenige Intervalle bei ${vo2Run}, damit das Tempo nicht verloren geht.`,
          structure: [
            block({ label: 'Einlaufen', durationMin: 15, target: easyRun, intensity: 'easy' }),
            block({
              label: '4× 2 min',
              repeats: 4,
              steps: [
                { label: '2 min flott', durationMin: 2, target: vo2Run, intensity: 'vo2' },
                { label: '2 min traben', durationMin: 2, target: easyRun, intensity: 'recovery' },
              ],
              target: vo2Run,
              intensity: 'vo2',
            }),
            block({ label: 'Auslaufen', durationMin: 12, target: easyRun, intensity: 'easy' }),
          ],
        }),
      )
    case 'run-hard': {
      const th = phase === 'build' && weekInPhase % 2 === 0
      const thReps = Math.min(5, 3 + Math.floor(weekInPhase / 2))
      const vo2Reps = Math.min(6, 4 + weekInPhase)
      return syncDuration(
        workout({
          date,
          sport: 'run',
          title: th ? 'Tempolauf Schwelle' : 'VO2-Intervalle',
          phase,
          intensity: th ? 'threshold' : 'vo2',
          durationMin: scaleDuration(65, weekHours, peakHours),
          description: th
            ? `${thReps}× 5 min bei ${thRun}, dazwischen 90 s traben.`
            : `${vo2Reps}× 3 min bei ${vo2Run}, dazwischen 90 s traben.`,
          structure: [
            block({ label: 'Einlaufen', durationMin: 15, target: easyRun, intensity: 'easy' }),
            block({
              label: th ? `${thReps}× 5 min Schwelle` : `${vo2Reps}× 3 min VO2`,
              repeats: th ? thReps : vo2Reps,
              steps: [
                {
                  label: th ? '5 min Schwelle' : '3 min VO2',
                  durationMin: th ? 5 : 3,
                  target: th ? thRun : vo2Run,
                  intensity: th ? 'threshold' : 'vo2',
                },
                { label: '90 s traben', durationMin: 1.5, target: easyRun, intensity: 'recovery' },
              ],
              target: th ? thRun : vo2Run,
              intensity: th ? 'threshold' : 'vo2',
            }),
            block({ label: 'Auslaufen', durationMin: 12, target: easyRun, intensity: 'easy' }),
          ],
        }),
      )
    }
    case 'brick':
      return syncDuration(
        workout({
          date,
          sport: 'brick',
          title: 'Brick Rad + Lauf',
          phase,
          intensity: phase === 'peak' ? 'steady' : 'easy',
          durationMin: scaleDuration(phase === 'peak' ? 120 : 100, weekHours, peakHours),
          description: `Rad im Ausdauerbereich, direkt danach laufen. Wechsel unter 3 Minuten.`,
          structure: [
            block({
              label: 'Rad',
              durationMin: scaleDuration(phase === 'peak' ? 80 : 70, weekHours, peakHours),
              target: phase === 'peak' ? target(fitness, 'bike', 'tempo') : easyBike,
              intensity: phase === 'peak' ? 'steady' : 'easy',
            }),
            block({ label: 'Wechsel', durationMin: 3, target: 'Helm ab, Schuhe an', intensity: 'steady' }),
            block({
              label: 'Lauf',
              durationMin: phase === 'peak' ? 25 : 18,
              target: phase === 'peak' ? thRun : easyRun,
              intensity: phase === 'peak' ? 'steady' : 'easy',
            }),
          ],
        }),
      )
    case 'strength':
      return syncDuration(
        workout({
          date,
          sport: 'strength',
          title: 'Kraft',
          phase,
          intensity: 'easy',
          durationMin: 45,
          description: 'Kniebeuge, Hip Hinge, Ausfallschritte, Rumpf, Zug. 3 Sätze, nicht bis zum Muskelversagen.',
          structure: [
            block({ label: 'Warm-up', durationMin: 8, target: 'Mobilisation', intensity: 'easy' }),
            block({ label: 'Hauptteil', durationMin: 28, target: '3× 6–8 Wiederholungen', intensity: 'steady' }),
            block({ label: 'Rumpf', durationMin: 8, target: 'Plank / Side Plank', intensity: 'easy' }),
          ],
        }),
      )
    default:
      return syncDuration(
        workout({
          date,
          sport: spec.sport,
          title: 'Training',
          phase,
          intensity: 'easy',
          durationMin: 50,
          description: '',
          structure: [block({ label: 'Training', durationMin: 50, target: 'nach Gefühl', intensity: 'easy' })],
        }),
      )
  }
}

function raceDayWorkout(date: string, race: RaceDistance, sports: TrainableSport[]): PlannedWorkout {
  const hasSwim = sports.includes('swim')
  const hasBike = sports.includes('bike')
  const hasRun = sports.includes('run')
  const triathlon = hasSwim && hasBike && hasRun
  return workout({
    date,
    sport: triathlon ? 'brick' : hasRun ? 'run' : hasBike ? 'bike' : 'swim',
    title: triathlon ? `Wettkampf ${RACE_LABEL[race]}` : `Wettkampftag ${RACE_LABEL[race]}`,
    phase: 'taper',
    intensity: 'race',
    durationMin: race === 'sprint' ? 90 : race === 'olympic' ? 180 : race === 'half' ? 360 : 720,
    description: 'Wettkampftag. Nichts Neues, früh frühstücken, der Plan hat dich hierher gebracht.',
    structure: [
      ...(hasSwim ? [block({ label: 'Schwimmen', target: 'Wettkampfpace', intensity: 'race' })] : []),
      ...(hasBike ? [block({ label: 'Rad', target: 'Wettkampfpace', intensity: 'race' })] : []),
      ...(hasRun ? [block({ label: 'Laufen', target: 'Wettkampfpace', intensity: 'race' })] : []),
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
  enabledSports?: TrainableSport[]
}): TrainingPlan {
  const today = options.startDate ?? isoDate(new Date())
  const startMonday = startOfWeekMonday(today)
  const race = options.raceType
  const raceDate = options.raceDate
  const available = options.availableDays.length ? [...options.availableDays].sort() : [0, 1, 2, 3, 4, 5]
  const sports: TrainableSport[] = options.enabledSports?.length ? options.enabledSports : ['swim', 'bike', 'run']

  const totalDays = Math.max(21, diffDays(startMonday, raceDate) + 1)
  const weekCount = Math.ceil(totalDays / 7)

  const targetHours = options.weeklyHoursTarget || PEAK_HOURS[race]
  const peakHours = Math.min(PEAK_HOURS[race], targetHours)
  const current = options.fitness.weeklyHours || peakHours
  const startHours = clamp(current, peakHours * 0.75, peakHours)

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
    const specs = weekTemplate(phase, race, available, sports)
    const weekSessions: PlannedWorkout[] = []

    for (const spec of specs) {
      const date = addDays(weekStart, spec.weekday)
      if (date > raceDate) continue
      if (date === raceDate) continue
      weekSessions.push(
        buildSession(spec, date, phase, hours, peakHours, phaseWeekCounter[phase], options.fitness, race, w === 0),
      )
    }
    fitWeekHours(weekSessions, hours)
    workouts.push(...weekSessions)
  }

  workouts.push(raceDayWorkout(raceDate, race, sports))
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
