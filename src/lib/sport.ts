import type { Sport, TrainableSport } from './types'

export type FocusPreset = 'triathlon' | 'run' | 'noSwim'

export const FOCUS_PRESETS: Array<{
  id: FocusPreset
  label: string
  hint: string
  sports: TrainableSport[]
}> = [
  { id: 'triathlon', label: 'Triathlon', hint: 'Schwimmen, Rad und Laufen', sports: ['swim', 'bike', 'run'] },
  { id: 'run', label: 'Nur Laufen', hint: 'Der ganze Plan nur mit Laufeinheiten', sports: ['run'] },
  { id: 'noSwim', label: 'Ohne Schwimmen', hint: 'Rad und Laufen, Schwimmen aus', sports: ['bike', 'run'] },
]

export function focusFromSports(sports: TrainableSport[]): FocusPreset | null {
  const key = sports
    .filter((sport) => sport !== 'strength')
    .slice()
    .sort()
    .join(',')
  if (key === 'bike,run,swim') return 'triathlon'
  if (key === 'run') return 'run'
  if (key === 'bike,run') return 'noSwim'
  return null
}

export const SPORT_LABEL: Record<Sport, string> = {
  swim: 'Schwimmen',
  bike: 'Rad',
  run: 'Laufen',
  brick: 'Brick',
  strength: 'Kraft',
  rest: 'Ruhe',
}

export const SPORT_DOT: Record<Sport, string> = {
  swim: 'bg-swim',
  bike: 'bg-bike',
  run: 'bg-run',
  brick: 'bg-ink',
  strength: 'bg-muted',
  rest: 'bg-line',
}

export const INTENSITY_LABEL: Record<string, string> = {
  recovery: 'Pause',
  easy: 'Easy',
  steady: 'Steady',
  threshold: 'Schwelle',
  vo2: 'VO2',
  race: 'Wettkampf',
  test: 'Test',
}

export const INTENSITY_BAR: Record<string, string> = {
  recovery: 'bg-line',
  easy: 'bg-swim',
  steady: 'bg-bike',
  threshold: 'bg-run',
  vo2: 'bg-strava',
  race: 'bg-ink',
  test: 'bg-ink',
}

export const INTENSITY_HEIGHT: Record<string, string> = {
  recovery: 'h-3',
  easy: 'h-5',
  steady: 'h-8',
  threshold: 'h-10',
  vo2: 'h-12',
  race: 'h-12',
  test: 'h-11',
}
