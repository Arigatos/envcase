import { defineEnv } from 'envcase'
import { z } from 'zod'

/**
 * Server-side environment variables — NEVER imported in client components.
 *
 * These are private: they are only available on the server and are not
 * included in the browser bundle. Do NOT prefix them with NEXT_PUBLIC_.
 *
 * Export `schema` separately so `npx envcase generate` and `npx envcase check`
 * can introspect it without running the app.
 */
export const schema = {
  // Database — private, server-only
  DATABASE_URL: z.string().url(),

  // Secret key for signing tokens / sessions — must be at least 32 chars
  API_SECRET: z.string().min(32),

  // Runtime — Next.js sets this automatically, but we validate it explicitly
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
}

/**
 * Validated server-side env.
 * Import this in Server Components, Route Handlers, and server actions ONLY.
 *
 * @example
 * import { serverEnv } from '@/env/server'
 * const db = createClient(serverEnv.DATABASE_URL)
 */
export const serverEnv = defineEnv(schema)
