import { mapStravaActivity } from './strava-map'

export { mapStravaActivity }

export const STRAVA_PRODUCTION_REDIRECT = 'https://trainer-psi-three.vercel.app/api/strava/callback'

export function isStravaConfigured(): boolean {
  const id = import.meta.env.VITE_STRAVA_CLIENT_ID
  return Boolean(id && id !== '123456')
}

export function stravaRedirectUri(): string {
  if (typeof window === 'undefined') {
    return import.meta.env.VITE_STRAVA_REDIRECT_URI || STRAVA_PRODUCTION_REDIRECT
  }
  const host = window.location.hostname
  if (host === 'localhost' || host === '127.0.0.1') {
    return `${window.location.origin}/api/strava/callback`
  }
  return import.meta.env.VITE_STRAVA_REDIRECT_URI || STRAVA_PRODUCTION_REDIRECT
}

export function stravaAuthorizeUrl(): string {
  const params = new URLSearchParams({
    client_id: import.meta.env.VITE_STRAVA_CLIENT_ID,
    response_type: 'code',
    redirect_uri: stravaRedirectUri(),
    approval_prompt: 'auto',
    scope: 'read,activity:read_all,profile:read_all',
  })
  return `https://www.strava.com/oauth/authorize?${params.toString()}`
}
