import { defineEnv } from 'envcase'
import { z } from 'zod'

/**
 * Client-side environment variables — safe to import in any component.
 *
 * Next.js bakes NEXT_PUBLIC_* variables into the browser bundle at build time.
 * envcase strips the prefix so your schema keys stay clean.
 *
 * In .env:  NEXT_PUBLIC_APP_URL=https://example.com
 * In code:  clientEnv.APP_URL   ← no prefix needed
 *
 * Export `schema` separately so `npx envcase generate` and `npx envcase check`
 * can introspect it without running the app.
 */
export const schema = {
  // Public-facing app URL — used for Open Graph tags, canonical links, etc.
  APP_URL: z.string().url(),

  // App display name
  APP_TITLE: z.string().default('My App'),

  // Feature flags — auto-coerced from "true"/"false"/"1"/"0"
  ENABLE_ANALYTICS: z.coerce.boolean().default(false),
}

/**
 * Validated client-side env.
 * Safe to import in Server Components, Client Components, and anywhere else.
 *
 * @example
 * import { clientEnv } from '@/env/client'
 * <meta property="og:url" content={clientEnv.APP_URL} />
 */
export const clientEnv = defineEnv(schema, {
  prefix: 'NEXT_PUBLIC_',
})
