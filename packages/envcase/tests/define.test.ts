import { describe, it, expect, vi } from 'vitest'
import { z } from 'zod'
import { defineEnv } from '../src/index.js'
import { EnvCaseError } from '../src/errors.js'

// ── core validation ────────────────────────────────────────────────────────

describe('defineEnv — core validation', () => {
  it('returns typed values from valid input', () => {
    const env = defineEnv(
      { DATABASE_URL: z.string().url(), PORT: z.coerce.number() },
      { source: { DATABASE_URL: 'https://db.example.com', PORT: '5432' } }
    )
    expect(env.DATABASE_URL).toBe('https://db.example.com')
    expect(env.PORT).toBe(5432)
  })

  it('throws EnvCaseError on missing required var', () => {
    expect(() =>
      defineEnv({ DATABASE_URL: z.string().url() }, { source: {} })
    ).toThrow(EnvCaseError)
  })

  it('throws EnvCaseError on invalid type', () => {
    expect(() =>
      defineEnv(
        { PORT: z.coerce.number().int().positive() },
        { source: { PORT: 'not-a-number' } }
      )
    ).toThrow(EnvCaseError)
  })

  it('collects all failing fields into a single error', () => {
    let err!: EnvCaseError
    try {
      defineEnv(
        { A: z.string(), B: z.string(), C: z.string() },
        { source: {} }
      )
    } catch (e) {
      err = e as EnvCaseError
    }
    expect(err.fields).toHaveLength(3)
    expect(err.fields.map((f) => f.key)).toEqual(['A', 'B', 'C'])
  })

  it('applies default values correctly', () => {
    const env = defineEnv(
      { PORT: z.coerce.number().default(3000) },
      { source: {} }
    )
    expect(env.PORT).toBe(3000)
  })

  it('handles optional fields without throwing', () => {
    const env = defineEnv(
      { SENTRY_DSN: z.string().url().optional() },
      { source: {} }
    )
    expect(env.SENTRY_DSN).toBeUndefined()
  })

  it('returns a frozen object', () => {
    const env = defineEnv({ PORT: z.coerce.number() }, { source: { PORT: '3000' } })
    expect(Object.isFrozen(env)).toBe(true)
  })
})

// ── coercion ───────────────────────────────────────────────────────────────

describe('defineEnv — coercion', () => {
  it('coerces numbers from strings', () => {
    const env = defineEnv({ PORT: z.coerce.number() }, { source: { PORT: '8080' } })
    expect(env.PORT).toBe(8080)
    expect(typeof env.PORT).toBe('number')
  })

  it('coerces boolean "true" and "1" to true', () => {
    for (const val of ['true', '1']) {
      const env = defineEnv({ FLAG: z.coerce.boolean() }, { source: { FLAG: val } })
      expect(env.FLAG).toBe(true)
    }
  })

  it('coerces boolean "false" and "0" to false', () => {
    for (const val of ['false', '0']) {
      const env = defineEnv({ FLAG: z.coerce.boolean() }, { source: { FLAG: val } })
      expect(env.FLAG).toBe(false)
    }
  })

  it('coerces booleans wrapped in .default()', () => {
    const env = defineEnv(
      { FLAG: z.coerce.boolean().default(false) },
      { source: { FLAG: 'true' } }
    )
    expect(env.FLAG).toBe(true)
  })

  it('coerces booleans wrapped in .optional()', () => {
    const env = defineEnv(
      { FLAG: z.coerce.boolean().optional() },
      { source: { FLAG: 'false' } }
    )
    expect(env.FLAG).toBe(false)
  })
})

// ── onError ────────────────────────────────────────────────────────────────

describe('defineEnv — onError option', () => {
  it('throws by default when validation fails', () => {
    expect(() =>
      defineEnv({ X: z.string() }, { source: {} })
    ).toThrow(EnvCaseError)
  })

  it('onError: warn — logs the error message but does not throw', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(() =>
      defineEnv({ X: z.string() }, { source: {}, onError: 'warn' })
    ).not.toThrow()
    expect(spy).toHaveBeenCalledOnce()
    expect(spy.mock.calls[0][0]).toContain('[envcase]')
    spy.mockRestore()
  })

  it('onError: warn — returns a partial object when validation fails', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const env = defineEnv(
      { PORT: z.coerce.number().default(3000), MISSING: z.string() },
      { source: {}, onError: 'warn' }
    )
    expect(env.PORT).toBe(3000)
    spy.mockRestore()
  })

  it('onError: silent — does not throw and does not log', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(() =>
      defineEnv({ X: z.string() }, { source: {}, onError: 'silent' })
    ).not.toThrow()
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})

// ── prefix ─────────────────────────────────────────────────────────────────

describe('defineEnv — prefix option', () => {
  it('strips prefix when reading from source', () => {
    const env = defineEnv(
      { PORT: z.coerce.number(), HOST: z.string() },
      { source: { VITE_PORT: '4000', VITE_HOST: 'localhost' }, prefix: 'VITE_' }
    )
    expect(env.PORT).toBe(4000)
    expect(env.HOST).toBe('localhost')
  })

  it('does not find prefixed keys when prefix is not set', () => {
    expect(() =>
      defineEnv(
        { PORT: z.coerce.number() },
        { source: { VITE_PORT: '4000' } }
      )
    ).toThrow(EnvCaseError)
  })

  it('strips prefix from process.env keys when adapter is "node"', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com'
    const env = defineEnv(
      { API_URL: z.string().url() },
      { adapter: 'node', prefix: 'NEXT_PUBLIC_' }
    )
    expect(env.API_URL).toBe('https://api.example.com')
    delete process.env.NEXT_PUBLIC_API_URL
  })

  it('error field keys use schema key names, not the prefixed source key names', () => {
    let err!: EnvCaseError
    try {
      defineEnv(
        { PORT: z.coerce.number(), HOST: z.string() },
        { source: {}, prefix: 'VITE_' }
      )
    } catch (e) {
      err = e as EnvCaseError
    }
    expect(err.fields.map((f) => f.key)).toEqual(['PORT', 'HOST'])
    expect(err.message).toContain('PORT')
    expect(err.message).not.toContain('VITE_PORT')
  })

  it('empty-string prefix is treated as no prefix', () => {
    const env = defineEnv(
      { API_KEY: z.string() },
      { source: { API_KEY: 'secret' }, prefix: '' }
    )
    expect(env.API_KEY).toBe('secret')
  })

  it('boolean coercion works correctly through prefix stripping', () => {
    const env = defineEnv(
      { DEBUG: z.coerce.boolean(), CACHE: z.coerce.boolean() },
      { source: { APP_DEBUG: 'false', APP_CACHE: '1' }, prefix: 'APP_' }
    )
    expect(env.DEBUG).toBe(false)
    expect(env.CACHE).toBe(true)
  })
})

// ── adapter option ─────────────────────────────────────────────────────────

describe('defineEnv — adapter option', () => {
  it('adapter: "node" reads from process.env', () => {
    process.env.ENVCASE_NODE_ADAPTER_TEST = '7777'
    const env = defineEnv(
      { ENVCASE_NODE_ADAPTER_TEST: z.coerce.number() },
      { adapter: 'node' }
    )
    expect(env.ENVCASE_NODE_ADAPTER_TEST).toBe(7777)
    delete process.env.ENVCASE_NODE_ADAPTER_TEST
  })

  it('adapter: "custom" with source uses that source', () => {
    const env = defineEnv(
      { API_KEY: z.string() },
      { adapter: 'custom', source: { API_KEY: 'from-custom' } }
    )
    expect(env.API_KEY).toBe('from-custom')
  })

  it('adapter: "custom" without source throws a configuration error', () => {
    expect(() =>
      defineEnv({ API_KEY: z.string() }, { adapter: 'custom' })
    ).toThrowError(/source.*required|custom.*source/i)
  })
})

// ── auto-detect ────────────────────────────────────────────────────────────

describe('defineEnv — explicit adapter: "node"', () => {
  it('reads process.env with explicit adapter: "node"', () => {
    process.env.ENVCASE_AUTO_DETECT = 'auto'
    const env = defineEnv({ ENVCASE_AUTO_DETECT: z.string() }, { adapter: 'node' })
    expect(env.ENVCASE_AUTO_DETECT).toBe('auto')
    delete process.env.ENVCASE_AUTO_DETECT
  })
})

// ── error fields integration ───────────────────────────────────────────────

describe('defineEnv — EnvCaseError.fields integration', () => {
  it('field.kind is "missing" for a required var that is absent', () => {
    let err!: EnvCaseError
    try {
      defineEnv({ DATABASE_URL: z.string().url() }, { source: {} })
    } catch (e) {
      err = e as EnvCaseError
    }
    expect(err.fields[0].kind).toBe('missing')
  })

  it('field.kind is "invalid" for a var with the wrong value', () => {
    let err!: EnvCaseError
    try {
      defineEnv({ PORT: z.coerce.number().int() }, { source: { PORT: 'abc' } })
    } catch (e) {
      err = e as EnvCaseError
    }
    expect(err.fields[0].kind).toBe('invalid')
  })

  it('field.envHint contains pipe-separated enum options for a missing z.enum var', () => {
    let err!: EnvCaseError
    try {
      defineEnv(
        { NODE_ENV: z.enum(['development', 'staging', 'production']) },
        { source: {} }
      )
    } catch (e) {
      err = e as EnvCaseError
    }
    expect(err.fields[0].envHint).toBe('development|staging|production')
  })

  it('field.envHint is undefined for a missing plain string var', () => {
    let err!: EnvCaseError
    try {
      defineEnv({ SECRET: z.string() }, { source: {} })
    } catch (e) {
      err = e as EnvCaseError
    }
    expect(err.fields[0].envHint).toBeUndefined()
  })

  it('error message lists all failing var names', () => {
    let message = ''
    try {
      defineEnv(
        { DATABASE_URL: z.string().url(), NODE_ENV: z.enum(['development', 'production']) },
        { source: {} }
      )
    } catch (e) {
      message = (e as Error).message
    }
    expect(message).toContain('DATABASE_URL')
    expect(message).toContain('NODE_ENV')
    expect(message).toContain('[envcase]')
  })
})
