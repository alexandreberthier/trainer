import { readCookieTokens } from '../../server/strava-core'

interface ApiRequest {
  headers: { cookie?: string | string[] }
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

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
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
