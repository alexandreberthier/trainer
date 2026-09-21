export interface StravaEnv {
  STRAVA_CLIENT_ID?: string
  STRAVA_CLIENT_SECRET?: string
  STRAVA_REDIRECT_URI?: string
  APP_URL?: string
}

export interface StravaTokens {
  access_token: string
  refresh_token: string
  expires_at: number
  athlete_id: number
  athlete_name: string
}

export const COOKIE = 'trainer_strava'

export function cleanEnv(value?: string): string {
  return (value ?? '').replace(/\r/g, '').trim()
}

export function envFromProcess(): StravaEnv {
  return {
    STRAVA_CLIENT_ID: cleanEnv(process.env.STRAVA_CLIENT_ID),
    STRAVA_CLIENT_SECRET: cleanEnv(process.env.STRAVA_CLIENT_SECRET),
    STRAVA_REDIRECT_URI: cleanEnv(process.env.STRAVA_REDIRECT_URI),
    APP_URL: cleanEnv(process.env.APP_URL),
  }
}

export function tokenCookie(tokens: StravaTokens, secure: boolean): string {
  const flags = secure ? '; Secure' : ''
  return `${COOKIE}=${encodeURIComponent(JSON.stringify(tokens))}; Path=/; HttpOnly; SameSite=Lax${flags}; Max-Age=${60 * 60 * 24 * 180}`
}

export function clearCookie(secure: boolean): string {
  const flags = secure ? '; Secure' : ''
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax${flags}; Max-Age=0`
}

export function readCookieTokens(cookieHeader?: string | null): StravaTokens | null {
  if (!cookieHeader) return null
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    const key = part.slice(0, idx).trim()
    if (key !== COOKIE) continue
    try {
      return JSON.parse(decodeURIComponent(part.slice(idx + 1).trim())) as StravaTokens
    } catch {
      return null
    }
  }
  return null
}

export function normalizeEnv(env: StravaEnv): StravaEnv {
  return {
    STRAVA_CLIENT_ID: cleanEnv(env.STRAVA_CLIENT_ID),
    STRAVA_CLIENT_SECRET: cleanEnv(env.STRAVA_CLIENT_SECRET),
    STRAVA_REDIRECT_URI: cleanEnv(env.STRAVA_REDIRECT_URI),
    APP_URL: cleanEnv(env.APP_URL),
  }
}

export async function exchangeCode(rawEnv: StravaEnv, code: string): Promise<StravaTokens> {
  const env = normalizeEnv(rawEnv)
  if (!env.STRAVA_CLIENT_ID || !env.STRAVA_CLIENT_SECRET) {
    throw new Error('Strava ist nicht konfiguriert (CLIENT_ID / CLIENT_SECRET).')
  }
  const body = new URLSearchParams({
    client_id: env.STRAVA_CLIENT_ID,
    client_secret: env.STRAVA_CLIENT_SECRET,
    code,
    grant_type: 'authorization_code',
  })
  if (env.STRAVA_REDIRECT_URI) body.set('redirect_uri', env.STRAVA_REDIRECT_URI)
  const res = await fetch('https://www.strava.com/oauth/token', { method: 'POST', body })
  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`Strava Token-Tausch fehlgeschlagen (${res.status}): ${detail.slice(0, 240)}`)
  }
  const data = (await res.json()) as {
    access_token: string
    refresh_token: string
    expires_at: number
    athlete?: { id: number; firstname?: string; lastname?: string }
  }
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
    athlete_id: data.athlete?.id ?? 0,
    athlete_name: [data.athlete?.firstname, data.athlete?.lastname].filter(Boolean).join(' '),
  }
}

export async function refreshIfNeeded(rawEnv: StravaEnv, tokens: StravaTokens): Promise<StravaTokens> {
  const env = normalizeEnv(rawEnv)
  if (tokens.expires_at * 1000 > Date.now() + 60_000) return tokens
  const body = new URLSearchParams({
    client_id: env.STRAVA_CLIENT_ID ?? '',
    client_secret: env.STRAVA_CLIENT_SECRET ?? '',
    grant_type: 'refresh_token',
    refresh_token: tokens.refresh_token,
  })
  const res = await fetch('https://www.strava.com/oauth/token', { method: 'POST', body })
  if (!res.ok) throw new Error('Strava-Token konnte nicht erneuert werden.')
  const data = (await res.json()) as { access_token: string; refresh_token: string; expires_at: number }
  return {
    ...tokens,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
  }
}

function mapActivity(raw: Record<string, unknown>) {
  const type = String(raw.sport_type || raw.type || '')
  const sport: 'swim' | 'bike' | 'run' | 'other' = /swim/i.test(type)
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

async function stravaGet(access: string, path: string): Promise<unknown> {
  const res = await fetch(`https://www.strava.com/api/v3${path}`, {
    headers: { Authorization: `Bearer ${access}` },
  })
  if (!res.ok) throw new Error(`Strava ${path} → ${res.status}`)
  return res.json()
}

export async function fetchActivities(access: string): Promise<ReturnType<typeof mapActivity>[]> {
  const after = Math.floor(Date.now() / 1000) - 12 * 7 * 24 * 3600
  const list: Record<string, unknown>[] = []
  for (let page = 1; page <= 4; page++) {
    const chunk = (await stravaGet(
      access,
      `/athlete/activities?after=${after}&per_page=100&page=${page}`,
    )) as Record<string, unknown>[]
    list.push(...chunk)
    if (chunk.length < 100) break
  }

  const mapped = list.map(mapActivity)
  const extra = [...mapped.filter((a) => a.sport === 'run').slice(0, 12), ...mapped.filter((a) => a.sport === 'swim').slice(0, 8)]
  const details = new Map<number, Record<string, unknown>>()
  for (const a of extra) {
    try {
      details.set(a.id, (await stravaGet(access, `/activities/${a.id}`)) as Record<string, unknown>)
    } catch {
      /* keep summary */
    }
  }
  return mapped.map((a) => {
    const raw = details.get(a.id)
    return raw ? mapActivity(raw) : a
  })
}
