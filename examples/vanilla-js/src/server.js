import { createServer } from 'node:http'
import { env } from './env.js'

// ── Request handler ───────────────────────────────────────────────────────

function handler(req, res) {
  if (env.ENABLE_REQUEST_LOGGING) {
    console.log(`${req.method} ${req.url}`)
  }

  const json = (status, body) => {
    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(body))
  }

  if (req.url === '/health') {
    return json(200, { status: 'ok', uptime: process.uptime() })
  }

  if (req.url === '/config') {
    // Expose non-sensitive config for debugging — never expose DATABASE_URL
    return json(200, {
      nodeEnv: env.NODE_ENV,
      port: env.PORT,
      host: env.HOST,
      requestLogging: env.ENABLE_REQUEST_LOGGING,
    })
  }

  if (req.url === '/') {
    return json(200, {
      message: 'Hello from envcase!',
      nodeEnv: env.NODE_ENV,
    })
  }

  json(404, { error: 'Not found' })
}

// ── Start ─────────────────────────────────────────────────────────────────

const server = createServer(handler)

server.listen(env.PORT, env.HOST, () => {
  console.log(`[server] http://${env.HOST}:${env.PORT}  (${env.NODE_ENV})`)
  console.log(`[server] database: ${new URL(env.DATABASE_URL).hostname}`)
  if (env.ENABLE_REQUEST_LOGGING) console.log('[server] request logging enabled')
})
