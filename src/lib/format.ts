/** Format seconds as m:ss or h:mm:ss */
export function formatDuration(totalSec: number): string {
  if (!Number.isFinite(totalSec) || totalSec < 0) return '—'
  const sec = Math.round(totalSec)
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

/** seconds per km → 5:42 /km */
export function formatPace(secPerKm: number | null | undefined, unit = '/km'): string {
  if (secPerKm == null || !Number.isFinite(secPerKm) || secPerKm <= 0) return '—'
  return `${formatDuration(secPerKm)} ${unit}`
}

export function formatPaceRange(low?: number, high?: number, unit = '/km'): string {
  if (low == null && high == null) return '—'
  if (low != null && high != null) return `${formatDuration(low)}–${formatDuration(high)} ${unit}`
  return formatPace(low ?? high ?? null, unit)
}

export function formatWatts(watts: number | null | undefined): string {
  if (watts == null || !Number.isFinite(watts)) return '—'
  return `${Math.round(watts)} W`
}

export function isoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function addDays(iso: string, days: number): string {
  const d = parseIsoDate(iso)
  d.setDate(d.getDate() + days)
  return isoDate(d)
}

export function diffDays(fromIso: string, toIso: string): number {
  const a = parseIsoDate(fromIso)
  const b = parseIsoDate(toIso)
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

export function startOfWeekMonday(iso: string): string {
  const d = parseIsoDate(iso)
  const day = d.getDay()
  const offset = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + offset)
  return isoDate(d)
}

export function weekdayIndex(iso: string): number {
  const d = parseIsoDate(iso)
  return (d.getDay() + 6) % 7
}

export const WEEKDAYS_DE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
export const WEEKDAYS_FULL_DE = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']
export const MONTHS_DE = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
]

export function formatDateLong(iso: string): string {
  const d = parseIsoDate(iso)
  return `${WEEKDAYS_FULL_DE[weekdayIndex(iso)]}, ${d.getDate()}. ${MONTHS_DE[d.getMonth()]}`
}

export function hoursFromSeconds(sec: number): number {
  return sec / 3600
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}
