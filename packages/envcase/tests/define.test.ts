import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { z } from 'zod'
import { defineEnv } from '../src/index.js'
import { EnvCaseError } from '../src/errors.js'

describe('defineEnv', () => {
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

  it('applies default values correctly', () => {
    const env = defineEnv(
      { PORT: z.coerce.number().default(3000) },
      { source: {} }
    )
    expect(env.PORT).toBe(3000)
  })

  it('coerces numbers from strings', () => {
    const env = defineEnv(
      { PORT: z.coerce.number() },
      { source: { PORT: '8080' } }
    )
    expect(env.PORT).toBe(8080)
    expect(typeof env.PORT).toBe('number')
  })

  it('coerces booleans from strings — true values', () => {
    const envTrue = defineEnv(
      { FLAG: z.coerce.boolean() },
      { source: { FLAG: 'true' } }
    )
    expect(envTrue.FLAG).toBe(true)

    const envOne = defineEnv(
      { FLAG: z.coerce.boolean() },
      { source: { FLAG: '1' } }
    )
    expect(envOne.FLAG).toBe(true)
  })

  it('coerces booleans from strings — false values', () => {
    const envFalse = defineEnv(
      { FLAG: z.coerce.boolean() },
      { source: { FLAG: 'false' } }
    )
    expect(envFalse.FLAG).toBe(false)

    const envZero = defineEnv(
      { FLAG: z.coerce.boolean() },
      { source: { FLAG: '0' } }
    )
    expect(envZero.FLAG).toBe(false)
  })

  it('handles optional fields without throwing', () => {
    const env = defineEnv(
      { SENTRY_DSN: z.string().url().optional() },
      { source: {} }
    )
    expect(env.SENTRY_DSN).toBeUndefined()
  })

  it('respects onError: warn — logs but does not throw', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    let result: unknown
    expect(() => {
      result = defineEnv(
        { DATABASE_URL: z.string().url() },
        { source: {}, onError: 'warn' }
      )
    }).not.toThrow()
    expect(consoleSpy).toHaveBeenCalled()
    const warnArg: string = consoleSpy.mock.calls[0][0] as string
    expect(warnArg).toContain('[envcase]')
    expect(result).toBeDefined()
    consoleSpy.mockRestore()
  })

  it('respects onError: silent — suppresses all output', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(() => {
      defineEnv(
        { DATABASE_URL: z.string().url() },
        { source: {}, onError: 'silent' }
      )
    }).not.toThrow()
    expect(consoleSpy).not.toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('strips key prefix when prefix option is set', () => {
    const env = defineEnv(
      { PORT: z.coerce.number(), HOST: z.string() },
      { source: { VITE_PORT: '4000', VITE_HOST: 'localhost' }, prefix: 'VITE_' }
    )
    expect(env.PORT).toBe(4000)
    expect(env.HOST).toBe('localhost')
  })

  it('error message lists all failing vars', () => {
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
