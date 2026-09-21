import type { IncomingMessage, ServerResponse } from 'node:http'
import { mapStravaActivity } from '../src/lib/strava-map'
import type { Activity } from '../src/lib/types'

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

const COOKIE = 'trainer_strava'

export function parseCookies(header?: string): Record<string, string> {
  const out: Record<string, string> = {}
  if (!header) return out
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim())
  }
  return out
}

export function readTokens(cookieHeader?: string): StravaTokens | null {
  const raw = parseCookies(cookieHeader)[COOKIE]
  if (!raw) return null
  try {
    return JSON.parse(raw) as StravaTokens
  } catch {
    return null
  }
}

export function tokenCookie(tokens: StravaTokens, maxAge = 60 * 60 * 24 * 180): string {
  return `${COOKIE}=${encodeURIComponent(JSON.stringify(tokens))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`
}

export function clearCookie(): string {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
}

async function exchangeCode(env: StravaEnv, code: string): Promise<StravaTokens> {
  if (!env.STRAVA_CLIENT_ID || !env.STRAVA_CLIENT_SECRET) {
    throw new Error('Strava ist nicht konfiguriert (CLIENT_ID / CLIENT_SECRET).')
  }
  const body = new URLSearchParams({
    client_id: env.STRAVA_CLIENT_ID,
    client_secret: env.STRAVA_CLIENT_SECRET,
    code,
    grant_type: 'authorization_code',
  })
  const res = await fetch('https://www.strava.com/oauth/token', { method: 'POST', body })
  if (!res.ok) throw new Error(`Strava Token-Tausch fehlgeschlagen (${res.status})`)
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

async function refreshIfNeeded(env: StravaEnv, tokens: StravaTokens): Promise<StravaTokens> {
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

async function stravaGet(access: string, path: string): Promise<unknown> {
  const res = await fetch(`https://www.strava.com/api/v3${path}`, {
    headers: { Authorization: `Bearer ${access}` },
  })
  if (!res.ok) throw new Error(`Strava ${path} → ${res.status}`)
  return res.json()
}

export async function fetchActivities(access: string): Promise<Activity[]> {
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

  const mapped = list.map(mapStravaActivity)
  const runs = mapped.filter((a) => a.sport === 'run').slice(0, 12)
  const swims = mapped.filter((a) => a.sport === 'swim').slice(0, 8)

  const details = new Map<number, Record<string, unknown>>()
  for (const a of [...runs, ...swims]) {
    try {
      const raw = (await stravaGet(access, `/activities/${a.id}`)) as Record<string, unknown>
      details.set(a.id, raw)
    } catch {
      /* keep summary */
    }
  }

  return mapped.map((a) => {
    const raw = details.get(a.id)
    return raw ? mapStravaActivity(raw) : a
  })
}

function sendJson(res: ServerResponse, status: number, body: unknown, extraHeaders: string[] = []) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  for (const h of extraHeaders) {
    const [k, ...rest] = h.split(':')
    res.setHeader(k, rest.join(':').trim())
  }
  res.end(JSON.stringify(body))
}

export async function handleStravaRequest(
  req: IncomingMessage,
  res: ServerResponse,
  env: StravaEnv,
): Promise<boolean> {
  const host = req.headers.host ?? 'localhost:5173'
  const url = new URL(req.url ?? '/', `http://${host}`)
  if (!url.pathname.startsWith('/api/strava')) return false

  try {
    if (url.pathname === '/api/strava/callback') {
      const err = url.searchParams.get('error')
      const app = env.APP_URL || `http://${host}`
      if (err) {
        res.statusCode = 302
        res.setHeader('Location', `${app}/?strava_error=${encodeURIComponent(err)}`)
        res.end()
        return true
      }
      const code = url.searchParams.get('code')
      if (!code) throw new Error('Kein OAuth-Code von Strava.')
      const tokens = await exchangeCode(env, code)
      res.statusCode = 302
      res.setHeader('Set-Cookie', tokenCookie(tokens))
      res.setHeader('Location', `${app}/app?strava=connected`)
      res.end()
      return true
    }

    if (url.pathname === '/api/strava/sync' && (req.method === 'GET' || req.method === 'POST')) {
      const existing = readTokens(req.headers.cookie)
      if (!existing) {
        sendJson(res, 401, { error: 'Nicht mit Strava verbunden.' })
        return true
      }
      const tokens = await refreshIfNeeded(env, existing)
      const activities = await fetchActivities(tokens.access_token)
      sendJson(res, 200, { athleteName: tokens.athlete_name, athleteId: tokens.athlete_id, activities }, [
        `Set-Cookie: ${tokenCookie(tokens)}`,
      ])
      return true
    }

    if (url.pathname === '/api/strava/status') {
      const tokens = readTokens(req.headers.cookie)
      sendJson(res, 200, {
        connected: Boolean(tokens),
        athleteName: tokens?.athlete_name ?? null,
      })
      return true
    }

    if (url.pathname === '/api/strava/logout' && req.method === 'POST') {
      sendJson(res, 200, { ok: true }, [`Set-Cookie: ${clearCookie()}`])
      return true
    }

    sendJson(res, 404, { error: 'Not found' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler'
    sendJson(res, 500, { error: message })
  }
  return true
}
