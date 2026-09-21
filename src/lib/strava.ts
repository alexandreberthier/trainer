import { mapStravaActivity } from './strava-map'

export { mapStravaActivity }

export function isStravaConfigured(): boolean {
  const id = import.meta.env.VITE_STRAVA_CLIENT_ID
  return Boolean(id && id !== '123456')
}

export function stravaAuthorizeUrl(): string {
  const params = new URLSearchParams({
    client_id: import.meta.env.VITE_STRAVA_CLIENT_ID,
    response_type: 'code',
    redirect_uri: `${window.location.origin}/api/strava/callback`,
    approval_prompt: 'auto',
    scope: 'read,activity:read_all,profile:read_all',
  })
  return `https://www.strava.com/oauth/authorize?${params.toString()}`
}
