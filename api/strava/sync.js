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

function cookieHeader(value) {
  if (Array.isArray(value)) return value.join('; ')
  return value
}

function readCookieTokens(header) {
  if (!header) return null
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    if (part.slice(0, idx).trim() !== 'trainer_strava') continue
    try {
      return JSON.parse(decodeURIComponent(part.slice(idx + 1).trim()))
    } catch {
      return null
    }
  }
  return null
}

function sendJson(res, status, body, cookie) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  if (cookie) res.setHeader('Set-Cookie', cookie)
  res.end(JSON.stringify(body))
}

function mapActivity(raw) {
  const type = String(raw.sport_type || raw.type || '')
  const sport = /swim/i.test(type) ? 'swim' : /ride|bike/i.test(type) ? 'bike' : /run/i.test(type) ? 'run' : 'other'
  const best = Array.isArray(raw.best_efforts)
    ? raw.best_efforts.map((be) => ({
        name: String(be.name ?? ''),
        distance: Number(be.distance ?? 0),
        elapsed_time: Number(be.elapsed_time ?? 0),
        moving_time: Number(be.moving_time ?? be.elapsed_time ?? 0),
        start_date: String(be.start_date ?? raw.start_date ?? ''),
      }))
    : undefined
  const laps = Array.isArray(raw.laps)
    ? raw.laps.map((lap) => ({
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

async function stravaGet(access, path) {
  const res = await fetch(`https://www.strava.com/api/v3${path}`, {
    headers: { Authorization: `Bearer ${access}` },
  })
  if (!res.ok) throw new Error(`Strava ${path} → ${res.status}`)
  return res.json()
}

async function refreshIfNeeded(env, tokens) {
  if (tokens.expires_at * 1000 > Date.now() + 60_000) return tokens
  const body = new URLSearchParams({
    client_id: env.STRAVA_CLIENT_ID ?? '',
    client_secret: env.STRAVA_CLIENT_SECRET ?? '',
    grant_type: 'refresh_token',
    refresh_token: tokens.refresh_token,
  })
  const res = await fetch('https://www.strava.com/oauth/token', { method: 'POST', body })
  if (!res.ok) throw new Error('Strava-Token konnte nicht erneuert werden.')
  const data = await res.json()
  return {
    ...tokens,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
  }
}

async function fetchActivities(access) {
  const after = Math.floor(Date.now() / 1000) - 12 * 7 * 24 * 3600
  const list = []
  for (let page = 1; page <= 4; page++) {
    const chunk = await stravaGet(access, `/athlete/activities?after=${after}&per_page=100&page=${page}`)
    list.push(...chunk)
    if (chunk.length < 100) break
  }
  const mapped = list.map(mapActivity)
  const extra = [
    ...mapped.filter((a) => a.sport === 'run').slice(0, 12),
    ...mapped.filter((a) => a.sport === 'swim').slice(0, 8),
  ]
  const details = new Map()
  for (const a of extra) {
    try {
      details.set(a.id, await stravaGet(access, `/activities/${a.id}`))
    } catch {
      /* keep summary */
    }
  }
  return mapped.map((a) => {
    const raw = details.get(a.id)
    return raw ? mapActivity(raw) : a
  })
}

export default async function handler(req, res) {
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
    let stravaFtp = null
    try {
      const athlete = await stravaGet(tokens.access_token, '/athlete')
      if (Number(athlete.ftp) > 50) stravaFtp = Math.round(Number(athlete.ftp))
    } catch {
      /* optional */
    }
    if (!stravaFtp) {
      try {
        const zones = await stravaGet(tokens.access_token, '/athlete/zones')
        const powerZones = zones.power?.zones
        if (Array.isArray(powerZones) && powerZones.length >= 4 && Number(powerZones[3].min) > 50) {
          stravaFtp = Math.round(Number(powerZones[3].min) / 0.91)
        }
      } catch {
        /* optional */
      }
    }
    sendJson(
      res,
      200,
      { athleteName: tokens.athlete_name, athleteId: tokens.athlete_id, activities, stravaFtp },
      tokenCookie(tokens, secure),
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler'
    sendJson(res, 500, { error: message })
  }
}
