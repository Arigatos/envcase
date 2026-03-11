import { defineEnv } from 'envcase'
import { z } from 'zod'

/**
 * Raw schema — exported separately so `npx envcase generate` and
 * `npx envcase check` can import it without running the full app.
 *
 * Schema keys are written WITHOUT the VITE_ prefix — envcase strips it
 * automatically via the `prefix` option.
 */
export const schema = {
  // Backend API base URL — required
  API_URL: z.string().url(),

  // App display name — optional, falls back to a default
  APP_TITLE: z.string().default('My App'),

  // Feature flags — auto-coerced from "true"/"false"/"1"/"0"
  ENABLE_ANALYTICS: z.coerce.boolean().default(false),
  ENABLE_DARK_MODE: z.coerce.boolean().default(false),
}

/**
 * Validated, fully-typed environment object.
 * Import this everywhere instead of reading import.meta.env directly.
 *
 * Variables must be set with the VITE_ prefix in your .env file:
 *   VITE_API_URL=https://api.example.com
 *
 * @example
 * import { env } from './env'
 * fetch(env.API_URL + '/users')
 */
export const env = defineEnv(schema, {
  adapter: 'vite',
  prefix: 'VITE_',
})
