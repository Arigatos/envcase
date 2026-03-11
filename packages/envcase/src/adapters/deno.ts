/**
 * Adapter that reads environment variables from `Deno.env`.
 * Use this in Deno runtimes.
 *
 * @param env - Override the env source (default: `Deno.env.toObject()`). Useful
 *              for testing — pass a plain object instead of the real Deno env.
 * @throws {Error} If `Deno` is not available (non-Deno environment) and no
 *                 override is provided.
 *
 * @example
 * ```ts
 * // Production: reads Deno.env automatically
 * export const env = defineEnv(schema, { adapter: 'deno' })
 *
 * // Tests: inject a plain object
 * import { denoAdapter } from 'envcase/adapters'
 * const result = denoAdapter({ PORT: '8000' })
 * ```
 */
export function denoAdapter(
  env?: Record<string, string | undefined>
): Record<string, string | undefined> {
  if (env != null) return env

  const deno = (globalThis as { Deno?: { env: { toObject(): Record<string, string> } } }).Deno

  if (!deno) {
    throw new Error(
      '[envcase] denoAdapter() requires a Deno runtime. ' +
        'Use this adapter only in Deno projects. ' +
        'For Node.js, use adapter: "node" instead.'
    )
  }

  return deno.env.toObject()
}
