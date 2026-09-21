import { loadEnv, type Plugin } from 'vite'
import { handleStravaRequest, type StravaEnv } from './strava-api'

export function stravaDevPlugin(): Plugin {
  return {
    name: 'strava-dev-api',
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), '') as StravaEnv
      server.middlewares.use((req, res, next) => {
        void (async () => {
          const handled = await handleStravaRequest(req, res, env)
          if (!handled) next()
        })()
      })
    },
  }
}
