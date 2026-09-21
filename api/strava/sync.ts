import {
  envFromProcess,
  fetchActivities,
  readCookieTokens,
  refreshIfNeeded,
  tokenCookie,
} from '../../server/strava-core'

interface ApiRequest {
  headers: { cookie?: string | string[]; host?: string }
}

interface ApiResponse {
  statusCode: number
  setHeader: (name: string, value: string) => void
  end: (body?: string) => void
}

function cookieHeader(value?: string | string[]): string | undefined {
  if (Array.isArray(value)) return value.join('; ')
  return value
}

function sendJson(res: ApiResponse, status: number, body: unknown, cookie?: string) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  if (cookie) res.setHeader('Set-Cookie', cookie)
  res.end(JSON.stringify(body))
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  const env = envFromProcess()
  const host = req.headers.host ?? 'trainer-psi-three.vercel.app'
  const app = env.APP_URL || `https://${host}`
  const secure = app.startsWith('https')

  try {
    const existing = readCookieTokens(cookieHeader(req.headers.cookie))
    if (!existing) {
      sendJson(res, 401, { error: 'Nicht mit Strava verbunden.' })
      return
    }
    const tokens = await refreshIfNeeded(env, existing)
    const activities = await fetchActivities(tokens.access_token)
    sendJson(
      res,
      200,
      { athleteName: tokens.athlete_name, athleteId: tokens.athlete_id, activities },
      tokenCookie(tokens, secure),
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler'
    sendJson(res, 500, { error: message })
  }
}
