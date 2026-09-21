import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  clearCookie,
  exchangeCode,
  fetchActivities,
  fetchStravaFtp,
  normalizeEnv,
  readCookieTokens,
  refreshIfNeeded,
  tokenCookie,
  type StravaEnv,
} from './strava-core'

export type { StravaEnv, StravaTokens } from './strava-core'

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
  env = normalizeEnv(env)
  const app = env.APP_URL || `http://${host}`
  const secure = app.startsWith('https')

  try {
    if (url.pathname === '/api/strava/callback') {
      const err = url.searchParams.get('error')
      if (err) {
        res.statusCode = 302
        res.setHeader('Location', `${app}/app?strava_error=${encodeURIComponent(err)}`)
        res.end()
        return true
      }
      const code = url.searchParams.get('code')
      if (!code) throw new Error('Kein OAuth-Code von Strava.')
      const tokens = await exchangeCode(env, code)
      res.statusCode = 302
      res.setHeader('Set-Cookie', tokenCookie(tokens, secure))
      res.setHeader('Location', `${app}/app?strava=connected`)
      res.end()
      return true
    }

    if (url.pathname === '/api/strava/sync' && (req.method === 'GET' || req.method === 'POST')) {
      const existing = readCookieTokens(req.headers.cookie)
      if (!existing) {
        sendJson(res, 401, { error: 'Nicht mit Strava verbunden.' })
        return true
      }
      const tokens = await refreshIfNeeded(env, existing)
      const activities = await fetchActivities(tokens.access_token)
      const stravaFtp = await fetchStravaFtp(tokens.access_token)
      sendJson(res, 200, { athleteName: tokens.athlete_name, athleteId: tokens.athlete_id, activities, stravaFtp }, [
        `Set-Cookie: ${tokenCookie(tokens, secure)}`,
      ])
      return true
    }

    if (url.pathname === '/api/strava/status') {
      const tokens = readCookieTokens(req.headers.cookie)
      sendJson(res, 200, {
        connected: Boolean(tokens),
        athleteName: tokens?.athlete_name ?? null,
      })
      return true
    }

    if (url.pathname === '/api/strava/logout' && req.method === 'POST') {
      sendJson(res, 200, { ok: true }, [`Set-Cookie: ${clearCookie(secure)}`])
      return true
    }

    sendJson(res, 404, { error: 'Not found' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler'
    sendJson(res, 500, { error: message })
  }
  return true
}
