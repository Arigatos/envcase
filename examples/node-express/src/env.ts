import { defineEnv } from 'envcase'
import { z } from 'zod'

/**
 * Raw schema — exported separately so `npx envcase generate` and
 * `npx envcase check` can import it without running the full app.
 */
export const schema = {
  // Database connection — required
  DATABASE_URL: z.string().url(),

  // HTTP port — defaults to 3000
  PORT: z.coerce.number().default(3000),

  // Runtime environment — required, must be one of the listed values
  NODE_ENV: z.enum(['development', 'staging', 'production']),

  // Optional error tracking DSN
  SENTRY_DSN: z.string().url().optional(),

  // Feature flag — auto-coerced from "true"/"false"/"1"/"0"
  ENABLE_CACHE: z.coerce.boolean().default(false),
}

/**
 * Validated, fully-typed environment object.
 * Import this everywhere instead of reading process.env directly.
 *
 * @example
 * import { env } from './env.js'
 * app.listen(env.PORT)
 */
export const env = defineEnv(schema)
