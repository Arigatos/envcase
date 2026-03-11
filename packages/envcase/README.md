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

> Zod is a peer dependency. You control the version.

---

## Basic Usage

Create an `env.ts` file at the root of your project and import it everywhere instead of `process.env`:

```ts
// src/env.ts
import { defineEnv } from 'envcase'
import { z } from 'zod'

export const env = defineEnv({
  // String — required
  DATABASE_URL: z.string().url(),

  // Number — auto-coerced from string, with default
  PORT: z.coerce.number().default(3000),

  // Enum
  NODE_ENV: z.enum(['development', 'staging', 'production']),

  // Optional
  SENTRY_DSN: z.string().url().optional(),

  // Boolean — auto-coerced from "true"/"false"/"1"/"0"
  ENABLE_CACHE: z.coerce.boolean().default(false),
})
```

```ts
// src/server.ts
import { env } from './env'

app.listen(env.PORT, () => {
  console.log(`Server running in ${env.NODE_ENV} mode`)
})
```

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
| `adapter` | `'node' \| 'custom'` | auto-detect | Which env source to use |
| `source` | `Record<string, string \| undefined>` | — | Custom env object (use with `adapter: 'custom'`) |
| `prefix` | `string` | — | Strip a prefix from source keys before matching schema |
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

> **Note:** Zod's built-in `Boolean()` coercion treats `"false"` as `true` (non-empty string). `envcase` pre-processes boolean fields correctly so `"false"` and `"0"` become `false`.

---

## Adapters

Adapters tell `envcase` where to read variables from.

### Node.js (default)

In a Node.js environment, `envcase` reads from `process.env` automatically — no configuration needed:

```ts
export const env = defineEnv({ PORT: z.coerce.number() })
// Reads process.env.PORT
```

You can also be explicit:

```ts
export const env = defineEnv(schema, { adapter: 'node' })
```

### Custom source

Pass any plain object as the env source. Useful for testing, edge runtimes, or non-standard environments:

```ts
export const env = defineEnv(schema, {
  adapter: 'custom',
  source: { PORT: '3000', DATABASE_URL: 'https://...' },
})
```

### Prefix stripping

Strip a prefix from source keys before matching against your schema. Useful for frameworks that namespace env vars:

```ts
// Source has: VITE_PORT, VITE_HOST
// Schema has: PORT, HOST

export const env = defineEnv(
  { PORT: z.coerce.number(), HOST: z.string() },
  { prefix: 'VITE_', source: import.meta.env }
)

env.PORT // reads VITE_PORT → number
env.HOST // reads VITE_HOST → string
```

### `onError` option

Control what happens when validation fails:

```ts
// 'throw' (default) — crashes the process with a clear error
defineEnv(schema, { onError: 'throw' })

// 'warn' — logs the error, returns partial result
defineEnv(schema, { onError: 'warn' })

// 'silent' — suppresses all output, returns partial result
defineEnv(schema, { onError: 'silent' })
```

> The default (`'throw'`) is strongly recommended. Silent failures in env config cause production bugs that are very hard to diagnose.

---

## Error Messages

This is a key differentiator. When validation fails, `envcase` throws an `EnvCaseError` with a human-readable message that tells you exactly what to fix.

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

## Testing

Pass a `source` object to isolate your tests from real environment variables:

```ts
import { defineEnv } from 'envcase'
import { env as appEnv } from '../src/env'

// In your test setup:
const testEnv = defineEnv(schema, {
  source: {
    DATABASE_URL: 'postgres://localhost/test',
    PORT: '5433',
    NODE_ENV: 'development',
  },
})
```

---

## CLI *(coming in v0.3.0)*

```bash
# Generate a .env.example from your schema
npx envcase generate

# Validate your .env without running the app
npx envcase check

# Show what's missing from .env vs .env.example
npx envcase diff
```

---

## Why envcase?

| Package | Types | Zod-native | CLI tooling | Framework-agnostic |
|---------|:-----:|:----------:|:-----------:|:-----------------:|
| `dotenv` | ❌ | ❌ | ❌ | ✅ |
| `t3-env` | ✅ | ✅ | ❌ | ❌ Next.js only |
| `envsafe` | ✅ | ❌ custom | ❌ | ✅ |
| `env-var` | ✅ | ❌ | ❌ | ✅ |
| `envalid` | ✅ | ❌ | ❌ | ✅ |
| **`envcase`** | ✅ | ✅ | ✅ *(v0.3)* | ✅ |

**The unique combination:** Zod-native validation (use the validators you already know) + human-readable errors that tell you exactly what to fix + framework-agnostic design that works in Node.js, Vite, Deno, and edge runtimes.

---

## License

MIT
