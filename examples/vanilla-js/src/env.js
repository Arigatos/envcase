import { defineEnv } from 'envcase'
import { z } from 'zod'

/**
 * Raw schema — exported separately so `npx envcase generate` and
 * `npx envcase check` can import it without running the server.
 *
 * @type {Record<string, import('zod').ZodTypeAny>}
 */
export const schema = {
  // Server bind address and port
  HOST: z.string().default('localhost'),
  PORT: z.coerce.number().default(3000),

  // Runtime mode
  NODE_ENV: z.enum(['development', 'production']).default('development'),

  // Database — required
  DATABASE_URL: z.string().url(),

  // Optional feature flag
  ENABLE_REQUEST_LOGGING: z.coerce.boolean().default(false),
}

/**
 * Validated env object. Import this everywhere instead of process.env.
 *
 * Loaded via `node --env-file=.env` — no dotenv dependency needed.
 *
 * @type {import('envcase').InferEnv<typeof schema>}
 */
export const env = defineEnv(schema)
