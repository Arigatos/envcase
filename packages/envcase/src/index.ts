/**
 * envcase — Type-safe, framework-agnostic environment variable validation with Zod.
 *
 * @example
 * ```ts
 * import { defineEnv } from 'envcase'
 * import { z } from 'zod'
 *
 * export const env = defineEnv({
 *   PORT: z.coerce.number().default(3000),
 *   DATABASE_URL: z.string().url(),
 *   NODE_ENV: z.enum(['development', 'staging', 'production']),
 * })
 * ```
 */
export { defineEnv } from './define.js'
export { EnvCaseError } from './errors.js'
export type { FieldError } from './errors.js'
export type { DefineEnvOptions, InferEnv } from './define.js'
