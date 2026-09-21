import {
  envFromProcess,
  exchangeCode,
  tokenCookie,
} from '../../server/strava-core'

type Query = Record<string, string | string[] | undefined>

interface ApiRequest {
  query?: Query
  url?: string
  headers: { host?: string }
}

interface ApiResponse {
  statusCode: number
  setHeader: (name: string, value: string) => void
  end: (body?: string) => void
}

function queryValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

function param(req: ApiRequest, key: string): string {
  const fromQuery = queryValue(req.query?.[key])
  if (fromQuery) return fromQuery
  if (!req.url) return ''
  try {
    return new URL(req.url, `https://${req.headers.host ?? 'localhost'}`).searchParams.get(key) ?? ''
  } catch {
    return ''
  }
}

function redirect(res: ApiResponse, location: string, cookie?: string) {
  res.statusCode = 302
  if (cookie) res.setHeader('Set-Cookie', cookie)
  res.setHeader('Location', location)
  res.end()
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  const env = envFromProcess()
  const host = req.headers.host ?? 'trainer-psi-three.vercel.app'
  const app = env.APP_URL || `https://${host}`
  const secure = app.startsWith('https')

  const oauthError = param(req, 'error')
  if (oauthError) {
    redirect(res, `${app}/app?strava_error=${encodeURIComponent(oauthError)}`)
    return
  }

  const code = param(req, 'code')
  if (!code) {
    redirect(res, `${app}/app?strava_error=${encodeURIComponent('Kein OAuth-Code')}`)
    return
  }

  try {
    const tokens = await exchangeCode(env, code)
    redirect(res, `${app}/app?strava=connected`, tokenCookie(tokens, secure))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler'
    redirect(res, `${app}/app?strava_error=${encodeURIComponent(message.slice(0, 180))}`)
  }
}
