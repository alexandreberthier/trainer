import type { Sport } from './types'

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
