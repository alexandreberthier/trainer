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

export default async function handler(req, res) {
  const tokens = readCookieTokens(cookieHeader(req.headers.cookie))
  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json')
  res.end(
    JSON.stringify({
      connected: Boolean(tokens),
      athleteName: tokens?.athlete_name ?? null,
    }),
  )
}
