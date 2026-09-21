function cleanEnv(value) {
  return (value ?? '').replace(/\r/g, '').trim()
}

function envFromProcess() {
  return {
    STRAVA_CLIENT_ID: cleanEnv(process.env.STRAVA_CLIENT_ID),
    STRAVA_CLIENT_SECRET: cleanEnv(process.env.STRAVA_CLIENT_SECRET),
    STRAVA_REDIRECT_URI: cleanEnv(process.env.STRAVA_REDIRECT_URI),
    APP_URL: cleanEnv(process.env.APP_URL),
  }
}

function tokenCookie(tokens, secure) {
  const flags = secure ? '; Secure' : ''
  return `trainer_strava=${encodeURIComponent(JSON.stringify(tokens))}; Path=/; HttpOnly; SameSite=Lax${flags}; Max-Age=${60 * 60 * 24 * 180}`
}

function queryValue(value) {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

function param(req, key) {
  const fromQuery = queryValue(req.query?.[key])
  if (fromQuery) return fromQuery
  if (!req.url) return ''
  try {
    return new URL(req.url, `https://${req.headers.host ?? 'localhost'}`).searchParams.get(key) ?? ''
  } catch {
    return ''
  }
}

function redirect(res, location, cookie) {
  res.statusCode = 302
  if (cookie) res.setHeader('Set-Cookie', cookie)
  res.setHeader('Location', location)
  res.end()
}

async function exchangeCode(env, code) {
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
  const data = await res.json()
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
    athlete_id: data.athlete?.id ?? 0,
    athlete_name: [data.athlete?.firstname, data.athlete?.lastname].filter(Boolean).join(' '),
  }
}

export default async function handler(req, res) {
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
