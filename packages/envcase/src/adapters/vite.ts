/**
 * Returns `import.meta.env` if available, otherwise `undefined`.
 * Kept in this ESM-only file so CJS builds never see `import.meta`.
 */
export function viteEnvIfAvailable(): Record<string, string | undefined> | undefined {
  return (import.meta as { env?: Record<string, string | undefined> }).env
}

/**
 * Adapter that reads environment variables from `import.meta.env`.
 * Use this in Vite-based projects (React, Vue, Svelte, etc.).
 *
 * @param env - Override the env source (default: `import.meta.env`). Useful
 *              for testing — pass a plain object instead of the real Vite env.
 * @throws {Error} If `import.meta.env` is not available (non-Vite environment)
 *                 and no override is provided.
 *
 * @example
 * ```ts
 * // Production: reads import.meta.env automatically
 * export const env = defineEnv(schema, { adapter: 'vite' })
 *
 * // Tests: inject a plain object
 * import { viteAdapter } from 'envcase/adapters'
 * const adapter = viteAdapter({ VITE_PORT: '5173' })
 * ```
 */
export function viteAdapter(
  env?: Record<string, string | undefined>
): Record<string, string | undefined> {
  const resolved = env !== undefined ? env : viteEnvIfAvailable()
  if (!resolved) {
    throw new Error(
      '[envcase] viteAdapter() requires import.meta.env. ' +
        'Use this adapter only in Vite-based projects (vite dev / vite build). ' +
        'For Node.js, use adapter: "node" instead.'
    )
  }

  return resolved
}
