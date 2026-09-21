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
