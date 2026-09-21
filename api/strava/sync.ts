import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleStravaRequest, type StravaEnv } from '../../server/strava-api'

function env(): StravaEnv {
  return {
    STRAVA_CLIENT_ID: process.env.STRAVA_CLIENT_ID,
    STRAVA_CLIENT_SECRET: process.env.STRAVA_CLIENT_SECRET,
    STRAVA_REDIRECT_URI: process.env.STRAVA_REDIRECT_URI,
    APP_URL: process.env.APP_URL,
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const incoming = req as unknown as import('node:http').IncomingMessage
  incoming.url = `/api/strava/sync`
  await handleStravaRequest(incoming, res as unknown as import('node:http').ServerResponse, env())
}
