import { describe, it, expect, afterEach, vi } from 'vitest'
import { z } from 'zod'
import { defineEnv } from '../src/index.js'
import { nodeAdapter, viteAdapter, denoAdapter } from '../src/adapters/index.js'
import { EnvCaseError } from '../src/errors.js'

// ── nodeAdapter ────────────────────────────────────────────────────────────

describe('nodeAdapter', () => {
  it('reads from process.env', () => {
    process.env.TEST_NODE_ADAPTER = 'hello'
    expect(nodeAdapter().TEST_NODE_ADAPTER).toBe('hello')
    delete process.env.TEST_NODE_ADAPTER
  })

  it('returns undefined for missing keys', () => {
    expect(nodeAdapter()['__DEFINITELY_NOT_SET__']).toBeUndefined()
  })
})

// ── viteAdapter ────────────────────────────────────────────────────────────
//
// viteAdapter() accepts an optional env parameter for testability.
// Without an argument it reads import.meta.env (the real Vite env at runtime).
// In tests we inject a plain object to avoid cross-module ESM snapshot issues.

describe('viteAdapter', () => {
  it('returns the env object when one is injected', () => {
    const fakeEnv = { VITE_FOO: 'bar' }
    expect(viteAdapter(fakeEnv)).toBe(fakeEnv)
  })

  it('reads values from the injected env', () => {
    const result = viteAdapter({ VITE_API_URL: 'https://api.example.com' })
    expect(result.VITE_API_URL).toBe('https://api.example.com')
  })

  it('returns undefined for keys absent from the injected env', () => {
    expect(viteAdapter({})['__VITE_NOT_SET__']).toBeUndefined()
  })

  it('throws when a falsy env is injected (simulates non-Vite environment)', () => {
    // Passing undefined triggers the default param (real import.meta.env in vitest).
    // Passing null bypasses the default and hits the guard — simulating a runtime
    // where import.meta.env is absent (e.g. plain Node.js ESM).
    expect(() =>
      viteAdapter(null as unknown as Record<string, string | undefined>)
    ).toThrow('[envcase] viteAdapter() requires import.meta.env')
  })

  it('does NOT read from process.env (reads from import.meta.env / injected env)', () => {
    process.env.ONLY_IN_PROCESS = 'should-not-appear'
    // Inject an empty object — process.env values must not bleed through
    const result = viteAdapter({})
    expect(result.ONLY_IN_PROCESS).toBeUndefined()
    delete process.env.ONLY_IN_PROCESS
  })

  it('works without argument in vitest (import.meta.env is available)', () => {
    // In a vitest environment import.meta.env is always injected, so no throw.
    expect(() => viteAdapter()).not.toThrow()
    expect(typeof viteAdapter()).toBe('object')
  })
})

// ── defineEnv — adapter: 'vite' ────────────────────────────────────────────
//
// When adapter: 'vite' is passed to defineEnv, resolveSource() calls
// viteAdapter() with no args — it reads the module-level import.meta.env.
// We test the integration by setting a key ONLY in process.env (not in
// import.meta.env) and confirming viteAdapter correctly does NOT find it.

describe('defineEnv — adapter: "vite"', () => {
  afterEach(() => {
    delete process.env.ONLY_PROCESS_KEY
    vi.unstubAllEnvs()
  })

  it('throws EnvCaseError for a key that is only in process.env, not import.meta.env', () => {
    // Direct assignment to process.env does NOT propagate to import.meta.env
    // in vitest's ESM module isolation model.  If defineEnv fell back to
    // nodeAdapter it would find the value; using viteAdapter it must not.
    process.env.ONLY_PROCESS_KEY = 'process-value'
    expect(() =>
      defineEnv({ ONLY_PROCESS_KEY: z.string() }, { adapter: 'vite' })
    ).toThrow(EnvCaseError)
  })

  it('throws EnvCaseError with correct field metadata when a required var is absent', () => {
    let err!: EnvCaseError
    try {
      defineEnv({ VITE_DB_URL: z.string().url() }, { adapter: 'vite' })
    } catch (e) {
      err = e as EnvCaseError
    }
    expect(err).toBeInstanceOf(EnvCaseError)
    expect(err.fields[0].key).toBe('VITE_DB_URL')
    expect(err.fields[0].kind).toBe('missing')
  })
})

// ── defineEnv — adapter: 'vite' via custom source (prefix integration) ─────
//
// Prefix + vite-style env is best tested by passing import.meta.env directly
// as a source object, which avoids cross-module ESM snapshot limitations while
// still exercising the full defineEnv pipeline with Vite-prefixed keys.

describe('defineEnv — vite-style source with prefix', () => {
  it('strips VITE_ prefix before matching schema keys', () => {
    const env = defineEnv(
      { APP_HOST: z.string(), APP_PORT: z.coerce.number() },
      { source: { VITE_APP_HOST: 'localhost', VITE_APP_PORT: '5173' }, prefix: 'VITE_' }
    )
    expect(env.APP_HOST).toBe('localhost')
    expect(env.APP_PORT).toBe(5173)
  })

  it('reads values correctly when source is a vite-style plain object', () => {
    const env = defineEnv(
      { API_URL: z.string().url(), DEBUG: z.coerce.boolean() },
      {
        source: { VITE_API_URL: 'https://api.example.com', VITE_DEBUG: 'true' },
        prefix: 'VITE_',
      }
    )
    expect(env.API_URL).toBe('https://api.example.com')
    expect(env.DEBUG).toBe(true)
  })
})

// ── denoAdapter ───────────────────────────────────────────────────────────
//
// denoAdapter() accepts an optional env parameter for testability.
// Without an argument it calls Deno.env.toObject() (Deno runtime only).
// In tests we inject a plain object, mirroring the viteAdapter pattern.

describe('denoAdapter', () => {
  it('returns the injected env object unchanged', () => {
    const fakeEnv = { DENO_VAR: 'hello' }
    expect(denoAdapter(fakeEnv)).toBe(fakeEnv)
  })

  it('reads values from the injected env', () => {
    const result = denoAdapter({ DATABASE_URL: 'postgres://localhost/db', PORT: '8000' })
    expect(result.DATABASE_URL).toBe('postgres://localhost/db')
    expect(result.PORT).toBe('8000')
  })

  it('returns undefined for keys absent from the injected env', () => {
    expect(denoAdapter({})['__DENO_NOT_SET__']).toBeUndefined()
  })

  it('does NOT read from process.env (reads only from Deno.env / injected env)', () => {
    process.env.ONLY_IN_PROCESS = 'should-not-appear'
    const result = denoAdapter({})
    expect(result.ONLY_IN_PROCESS).toBeUndefined()
    delete process.env.ONLY_IN_PROCESS
  })

  it('throws with an [envcase] message when called without args in a non-Deno environment', () => {
    // In vitest (Node.js), Deno is not defined — calling with no args must throw.
    expect(() => denoAdapter()).toThrow('[envcase]')
    expect(() => denoAdapter()).toThrow(/Deno/)
  })

  it('throws when null is passed (simulates absent Deno.env)', () => {
    expect(() =>
      denoAdapter(null as unknown as Record<string, string | undefined>)
    ).toThrow('[envcase]')
  })
})

// ── defineEnv — adapter: 'deno' ────────────────────────────────────────────

describe('defineEnv — adapter: "deno"', () => {
  it('throws a Deno-not-available error (not EnvCaseError) in a non-Deno environment', () => {
    // resolveSource() calls denoAdapter() with no args → throws because Deno is absent.
    // The error is a config error, not a validation EnvCaseError.
    let err!: Error
    try {
      defineEnv({ MY_VAR: z.string() }, { adapter: 'deno' })
    } catch (e) {
      err = e as Error
    }
    expect(err).toBeInstanceOf(Error)
    expect(err).not.toBeInstanceOf(EnvCaseError)
    expect(err.message).toMatch(/\[envcase\]/)
    expect(err.message).toMatch(/Deno/)
  })
})

// ── defineEnv — deno-style source with prefix ──────────────────────────────
//
// Full pipeline test: mirrors how a Deno project would use envcase
// (Deno.env.toObject() result passed as source with a prefix).

describe('defineEnv — deno-style source with prefix', () => {
  it('validates a schema against a Deno-style plain object source', () => {
    const env = defineEnv(
      { PORT: z.coerce.number(), HOST: z.string() },
      { source: { PORT: '8000', HOST: 'localhost' } }
    )
    expect(env.PORT).toBe(8000)
    expect(env.HOST).toBe('localhost')
  })

  it('strips a prefix from Deno-style env keys', () => {
    const env = defineEnv(
      { API_KEY: z.string(), DEBUG: z.coerce.boolean() },
      {
        source: { APP_API_KEY: 'secret', APP_DEBUG: 'false' },
        prefix: 'APP_',
      }
    )
    expect(env.API_KEY).toBe('secret')
    expect(env.DEBUG).toBe(false)
  })

  it('throws EnvCaseError when a required Deno-style var is missing', () => {
    expect(() =>
      defineEnv({ DATABASE_URL: z.string().url() }, { source: {} })
    ).toThrow(EnvCaseError)
  })
})

// ── defineEnv — custom source ──────────────────────────────────────────────

describe('defineEnv — custom source', () => {
  it('validates against a plain object source', () => {
    const env = defineEnv(
      { API_KEY: z.string().min(1) },
      { source: { API_KEY: 'secret123' } }
    )
    expect(env.API_KEY).toBe('secret123')
  })

  it('custom source overrides process.env', () => {
    process.env.API_KEY = 'from-process-env'
    const env = defineEnv(
      { API_KEY: z.string() },
      { source: { API_KEY: 'from-custom' } }
    )
    expect(env.API_KEY).toBe('from-custom')
    delete process.env.API_KEY
  })
})

// ── auto-detect ────────────────────────────────────────────────────────────
//
// Auto-detect priority: Deno → Vite (import.meta.env) → Node (process.env)
//
// NOTE: vitest runs in Node.js but INJECTS import.meta.env into every module,
// so auto-detect will choose viteAdapter in this test environment. That means
// tests that rely on auto-detect reading process.env must use adapter: 'node'
// explicitly. The auto-detect tests below verify the priority chain via
// observable side effects and globalThis mocking.

describe('defineEnv — explicit adapter: "node" (was auto-detect)', () => {
  it('reads process.env with explicit adapter: "node"', () => {
    process.env.ENVCASE_AUTO = '42'
    const env = defineEnv({ ENVCASE_AUTO: z.coerce.number() }, { adapter: 'node' })
    expect(env.ENVCASE_AUTO).toBe(42)
    delete process.env.ENVCASE_AUTO
  })
})

describe('defineEnv — auto-detect adapter', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses denoAdapter when globalThis.Deno is defined', () => {
    vi.stubGlobal('Deno', { env: { toObject: () => ({ DENO_ONLY: 'from-deno' }) } })
    const env = defineEnv({ DENO_ONLY: z.string() })
    expect(env.DENO_ONLY).toBe('from-deno')
  })

  it('prioritizes Deno over nodeAdapter when both could match', () => {
    process.env.DENO_ONLY = 'from-process'
    vi.stubGlobal('Deno', { env: { toObject: () => ({ DENO_ONLY: 'from-deno' }) } })
    const env = defineEnv({ DENO_ONLY: z.string() })
    expect(env.DENO_ONLY).toBe('from-deno')
    delete process.env.DENO_ONLY
  })

  it('uses viteAdapter when Deno is absent and import.meta.env is available (vitest environment)', () => {
    // vitest injects import.meta.env → auto-detect picks viteAdapter.
    // A key only in process.env must NOT be found (viteAdapter reads import.meta.env).
    process.env.ONLY_PROCESS_AUTO = 'should-not-appear'
    expect(() =>
      defineEnv({ ONLY_PROCESS_AUTO: z.string() })
    ).toThrow(EnvCaseError)
    delete process.env.ONLY_PROCESS_AUTO
  })

  it('resolves Deno env vars via Zod coercion when auto-detected', () => {
    vi.stubGlobal('Deno', { env: { toObject: () => ({ DENO_PORT: '9000' }) } })
    const env = defineEnv({ DENO_PORT: z.coerce.number() })
    expect(env.DENO_PORT).toBe(9000)
  })

  it('throws EnvCaseError (not a raw error) when Deno auto-detect finds a missing var', () => {
    vi.stubGlobal('Deno', { env: { toObject: () => ({}) } })
    expect(() => defineEnv({ MISSING_DENO_VAR: z.string() })).toThrow(EnvCaseError)
  })
})
