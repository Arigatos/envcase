# envcase

**Type-safe, framework-agnostic environment variable validation with Zod.**

Stop accessing `process.env` directly and getting untyped strings. `envcase` validates your environment variables at startup, converts them to the right types, and gives you a fully-typed object with great autocomplete — or crashes loudly with a human-readable error before your app ever runs.

---

## Before & After

**Before — raw `process.env`:**

```ts
// No types. No validation. Surprises at runtime.
const port = process.env.PORT        // string | undefined
const db   = process.env.DATABASE_URL // string | undefined — could be missing

app.listen(port)  // ❌ TypeError: port is not a number
```

**After — envcase:**

```ts
import { defineEnv } from 'envcase'
import { z } from 'zod'

export const env = defineEnv({
  PORT:         z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  NODE_ENV:     z.enum(['development', 'staging', 'production']),
})

// Fully typed — autocomplete works, no guessing:
env.PORT         // number
env.DATABASE_URL // string
env.NODE_ENV     // "development" | "staging" | "production"
env.TYPO_URL     // ❌ TypeScript error — doesn't exist
```

If any variable is missing or invalid, `envcase` throws a clear error **at startup** — not buried deep in a runtime failure.

---

## Install

```bash
npm install envcase zod
# or
pnpm add envcase zod
# or
yarn add envcase zod
```

> Zod is a peer dependency. You control the version. **Zod v3 only** — Zod v4 support is planned for a future release.

---

## Basic Usage

Create an `env.ts` file and import it everywhere instead of `process.env`:

```ts
// src/env.ts
import { defineEnv } from 'envcase'
import { z } from 'zod'

export const schema = {
  DATABASE_URL: z.string().url(),
  PORT:         z.coerce.number().default(3000),
  NODE_ENV:     z.enum(['development', 'staging', 'production']),
  SENTRY_DSN:   z.string().url().optional(),
  ENABLE_CACHE: z.coerce.boolean().default(false),
}

export const env = defineEnv(schema)
```

```ts
// src/server.ts
import { env } from './env'

app.listen(env.PORT, () => {
  console.log(`Server running in ${env.NODE_ENV} mode`)
})
```

> **Tip:** Export `schema` separately from `env`. The CLI commands (`envcase generate`, `envcase check`) import your schema file directly — if `defineEnv` throws during import because a variable is missing, the CLI can't read it.

---

## Full API

### `defineEnv(schema, options?)`

Validates environment variables against a Zod schema. Returns a frozen, fully-typed object.

```ts
import { defineEnv } from 'envcase'

const env = defineEnv(schema, options)
```

#### `schema`

A plain object mapping variable names to Zod validators:

```ts
defineEnv({
  MY_STRING:  z.string(),
  MY_NUMBER:  z.coerce.number(),
  MY_BOOLEAN: z.coerce.boolean(),
  MY_ENUM:    z.enum(['a', 'b', 'c']),
  MY_URL:     z.string().url(),
  MY_OPT:     z.string().optional(),
  MY_DEFAULT: z.coerce.number().default(8080),
})
```

#### `options`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `adapter` | `'node' \| 'vite' \| 'deno' \| 'custom'` | auto-detect | Which env source to use |
| `source` | `Record<string, string \| undefined>` | — | Custom env object. Use with `adapter: 'custom'` or alone as a shorthand |
| `prefix` | `string` | — | Strip a prefix from source keys before matching schema (e.g. `'VITE_'`, `'NEXT_PUBLIC_'`) |
| `onError` | `'throw' \| 'warn' \| 'silent'` | `'throw'` | Behaviour when validation fails |

#### Type inference

The return type is fully inferred from your schema — no manual typing needed:

```ts
import type { InferEnv } from 'envcase'

const schema = {
  PORT: z.coerce.number(),
  HOST: z.string(),
}

type MyEnv = InferEnv<typeof schema>
// { PORT: number; HOST: string }
```

---

## Coercion

All environment variables are strings at runtime. `envcase` uses Zod's coercion — with one important fix for booleans:

| Schema | Input string | Output |
|--------|-------------|--------|
| `z.coerce.number()` | `"3000"` | `3000` |
| `z.coerce.boolean()` | `"true"` | `true` |
| `z.coerce.boolean()` | `"1"` | `true` |
| `z.coerce.boolean()` | `"false"` | `false` |
| `z.coerce.boolean()` | `"0"` | `false` |

> **Note:** Zod's built-in `Boolean()` coercion treats `"false"` as `true` (any non-empty string). `envcase` pre-processes boolean fields so `"false"` and `"0"` correctly become `false`.

---

## Adapters

Adapters tell `envcase` where to read variables from. By default, `envcase` auto-detects the runtime.

### Auto-detect

When no `adapter` is specified, `envcase` picks the right source automatically:

1. **Deno** — if `globalThis.Deno` is defined, uses `Deno.env`
2. **Vite** — if `import.meta.env` is available, uses that
3. **Node.js** — fallback, reads `process.env`

```ts
// No adapter needed — envcase figures it out
export const env = defineEnv(schema)
```

### Node.js

Reads from `process.env`. The default in Node.js environments.

```ts
export const env = defineEnv(schema)
// or explicitly:
export const env = defineEnv(schema, { adapter: 'node' })
```

### Vite

Reads from `import.meta.env`. Use in Vite-based projects (React, Vue, Svelte, etc.).

Vite requires public variables to be prefixed with `VITE_`. Use the `prefix` option so your schema keys stay clean:

```ts
// .env file:        VITE_API_URL=https://api.example.com
// Schema key:       API_URL
// Accessed as:      env.API_URL

export const env = defineEnv(
  { API_URL: z.string().url(), DEBUG: z.coerce.boolean().default(false) },
  { adapter: 'vite', prefix: 'VITE_' }
)
```

You can also import and use the adapter directly for testing:

```ts
import { viteAdapter } from 'envcase/adapters'

// Inject a plain object instead of reading import.meta.env
const result = viteAdapter({ VITE_API_URL: 'https://api.example.com' })
```

### Deno

Reads from `Deno.env.toObject()`. Use in Deno runtimes.

```ts
export const env = defineEnv(schema, { adapter: 'deno' })
```

For testing, inject a plain object:

```ts
import { denoAdapter } from 'envcase/adapters'

const result = denoAdapter({ PORT: '8000', DATABASE_URL: 'postgres://...' })
```

### Custom source

Pass any plain object as the env source. Useful for testing, edge runtimes, or non-standard environments:

```ts
export const env = defineEnv(schema, {
  adapter: 'custom',
  source: { PORT: '3000', DATABASE_URL: 'https://...' },
})

// source alone (without adapter: 'custom') is a shorthand:
export const env = defineEnv(schema, {
  source: { PORT: '3000', DATABASE_URL: 'https://...' },
})
```

### Prefix stripping

Strip a prefix from source keys before matching against your schema. Works with any adapter:

```ts
// NEXT_PUBLIC_ prefix (Next.js)
export const clientEnv = defineEnv(
  { APP_URL: z.string().url(), ENABLE_ANALYTICS: z.coerce.boolean().default(false) },
  { prefix: 'NEXT_PUBLIC_' }
)
// Reads NEXT_PUBLIC_APP_URL → env.APP_URL

// VITE_ prefix
export const env = defineEnv(schema, { adapter: 'vite', prefix: 'VITE_' })

// Custom prefix
export const env = defineEnv(schema, { prefix: 'APP_', source: mySource })
```

### `onError` option

Control what happens when validation fails:

```ts
// 'throw' (default) — crashes the process with a clear error
defineEnv(schema, { onError: 'throw' })

// 'warn' — logs the error to console.warn, returns partial result
defineEnv(schema, { onError: 'warn' })

// 'silent' — suppresses all output, returns partial result
defineEnv(schema, { onError: 'silent' })
```

> The default (`'throw'`) is strongly recommended. Silent failures in env config cause production bugs that are very hard to diagnose.

---

## Error Messages

When validation fails, `envcase` throws an `EnvCaseError` with a human-readable message that tells you exactly what to fix.

### Missing variables

```
[envcase] Environment validation failed:

  ❌ DATABASE_URL   → Required but missing
  ❌ NODE_ENV       → Required but missing

  💡 Add these to your .env file:

     DATABASE_URL=
     NODE_ENV=development|staging|production

  Run `npx envcase generate` to auto-create a .env.example
```

### Wrong type or value

```
[envcase] Environment validation failed:

  ❌ PORT           → Expected number, got "not-a-number"
  ❌ NODE_ENV       → Expected "development" | "staging" | "production", got "prod"

  💡 Check your .env file and fix the values above.
```

### Catching errors programmatically

```ts
import { defineEnv, EnvCaseError } from 'envcase'

try {
  const env = defineEnv(schema)
} catch (err) {
  if (err instanceof EnvCaseError) {
    // err.fields — array of { key, message, kind, envHint }
    for (const field of err.fields) {
      console.log(field.key, field.kind, field.message)
    }
  }
}
```

---

## CLI

Three commands cover the full env workflow. No config file needed — point them at your schema.

### `npx envcase generate`

Reads your schema and writes a `.env.example` file with type annotations and default values:

```bash
npx envcase generate
npx envcase generate --schema src/env.ts --output .env.example
```

```
[envcase] ✅ Generated .env.example
```

Generated `.env.example`:
```
DATABASE_URL=  # string (url) — required
PORT=3000  # number — default: 3000
NODE_ENV=  # "development" | "staging" | "production" — required
SENTRY_DSN=  # string (url) — optional
ENABLE_CACHE=false  # boolean — default: false
```

### `npx envcase check`

Validates your `.env` file against your schema without starting the app. Exits 0 on success, 1 on failure.

```bash
npx envcase check
npx envcase check --schema src/env.ts --env .env
```

```
[envcase] ✅ All environment variables are valid.

# or on failure:
[envcase] ❌ Validation failed:
  NODE_ENV → Expected "development" | "staging" | "production", got "prod"
```

### `npx envcase diff`

Compares your `.env` against `.env.example` and reports what's missing. Exits 0 if nothing is missing, 1 otherwise.

```bash
npx envcase diff
npx envcase diff --example .env.example --env .env
```

```
[envcase] ⚠️  Your .env is missing 2 variables from .env.example:

  + SENTRY_DSN  (optional)
  + ENABLE_CACHE  (has default: false)

  Run `npx envcase check` to validate current values.

# or when everything is present:
[envcase] ✅ Your .env matches .env.example — nothing missing.
```

### Schema file requirements

The CLI imports your schema file and looks for a named `schema` export. Export it alongside `env`:

```ts
// src/env.ts
export const schema = {          // ← CLI reads this
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
}

export const env = defineEnv(schema)  // ← app uses this
```

---

## Testing

Pass a `source` object to isolate your tests from real environment variables:

```ts
import { defineEnv } from 'envcase'

const testEnv = defineEnv(schema, {
  source: {
    DATABASE_URL: 'postgres://localhost/test',
    PORT: '5433',
    NODE_ENV: 'development',
  },
})
```

For adapter-specific testing, inject a plain object directly into the adapter:

```ts
import { viteAdapter, denoAdapter } from 'envcase/adapters'

// Test viteAdapter without import.meta.env
const viteResult = viteAdapter({ VITE_API_URL: 'https://api.example.com' })

// Test denoAdapter without a Deno runtime
const denoResult = denoAdapter({ PORT: '8000' })
```

---

## Examples

| Example | Adapter | Notes |
|---------|---------|-------|
| [`examples/node-express`](../../examples/node-express) | `node` | Express app, `process.env` |
| [`examples/vite-react`](../../examples/vite-react) | `vite` + `prefix: 'VITE_'` | React SPA |
| [`examples/vue`](../../examples/vue) | `vite` + `prefix: 'VITE_'` | Vue 3 SPA |
| [`examples/svelte`](../../examples/svelte) | `vite` + `prefix: 'VITE_'` | Svelte SPA |
| [`examples/nextjs`](../../examples/nextjs) | `node` (server) + `prefix: 'NEXT_PUBLIC_'` (client) | App Router, split server/client env |
| [`examples/vanilla-js`](../../examples/vanilla-js) | `node` | Plain JS, no bundler, `node --env-file=.env` |

### Node.js / Express

```ts
// src/env.ts
export const schema = {
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'staging', 'production']),
}
export const env = defineEnv(schema)
```

### Vite (React / Vue / Svelte)

```ts
// src/env.ts — VITE_ prefix in .env, clean keys in code
export const schema = {
  API_URL: z.string().url(),
  ENABLE_ANALYTICS: z.coerce.boolean().default(false),
}
export const env = defineEnv(schema, { adapter: 'vite', prefix: 'VITE_' })
```

### Next.js (App Router)

```ts
// src/env/server.ts — private, server-only
export const schema = { DATABASE_URL: z.string().url(), API_SECRET: z.string().min(32) }
export const serverEnv = defineEnv(schema)

// src/env/client.ts — public, safe in browser
export const schema = { APP_URL: z.string().url(), ENABLE_ANALYTICS: z.coerce.boolean().default(false) }
export const clientEnv = defineEnv(schema, { prefix: 'NEXT_PUBLIC_' })
```

---

## Why envcase?

- **Zod-native** — use the same schema library you already know
- **Type-safe** — fully inferred types, no manual typing needed
- **Fail fast** — crashes at startup with a clear error, not buried in runtime
- **Runtime adapters** — works with Node.js, Vite, and Deno out of the box
- **CLI tooling** — `generate`, `check`, `diff` for team workflows
- **Framework-agnostic** — Express, Fastify, Next.js, SvelteKit, anything

---

## License

MIT
