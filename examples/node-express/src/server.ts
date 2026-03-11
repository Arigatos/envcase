import express, { type Request, type Response } from 'express'
import { env } from './env.js'

const app = express()
app.use(express.json())

// ── Routes ────────────────────────────────────────────────────────────────

app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Hello from envcase!',
    nodeEnv: env.NODE_ENV,
    cacheEnabled: env.ENABLE_CACHE,
  })
})

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', uptime: process.uptime() })
})

app.get('/config', (_req: Request, res: Response) => {
  // Expose non-sensitive config for debugging
  res.json({
    port: env.PORT,
    nodeEnv: env.NODE_ENV,
    cacheEnabled: env.ENABLE_CACHE,
    sentryConfigured: env.SENTRY_DSN != null,
  })
})

// ── Start ─────────────────────────────────────────────────────────────────

app.listen(env.PORT, () => {
  console.log(`[server] Running on http://localhost:${env.PORT} (${env.NODE_ENV})`)
  console.log(`[server] Database: ${env.DATABASE_URL}`)
  if (env.ENABLE_CACHE) console.log('[server] Cache is enabled')
  if (env.SENTRY_DSN) console.log('[server] Sentry error tracking active')
})

export { app }
