import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { tmpdir } from 'node:os'
import { readFileSync, existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { generateContent, runGenerate } from '../src/cli/generate.js'
import { checkEnv, parseEnvFile, formatCheckResult, runCheck } from '../src/cli/check.js'
import { parseExampleFile, diffEnv, formatDiffResult, runDiff } from '../src/cli/diff.js'

// ── generateContent ────────────────────────────────────────────────────────

describe('generateContent — required string', () => {
  it('produces a line with empty value for a required string field', () => {
    const out = generateContent({ DATABASE_URL: z.string() })
    expect(out).toContain('DATABASE_URL=')
  })

  it('marks a required string as required in the comment', () => {
    const out = generateContent({ DATABASE_URL: z.string() })
    expect(out).toContain('required')
  })

  it('labels the type as "string"', () => {
    const out = generateContent({ DATABASE_URL: z.string() })
    expect(out).toContain('string')
  })
})

describe('generateContent — string with url constraint', () => {
  it('labels type as "string (url)"', () => {
    const out = generateContent({ DATABASE_URL: z.string().url() })
    expect(out).toContain('string (url)')
  })

  it('marks a required url string as required', () => {
    const out = generateContent({ DATABASE_URL: z.string().url() })
    expect(out).toContain('required')
  })
})

describe('generateContent — number with default', () => {
  it('uses the default value as the line value', () => {
    const out = generateContent({ PORT: z.coerce.number().default(3000) })
    expect(out).toContain('PORT=3000')
  })

  it('labels the type as "number"', () => {
    const out = generateContent({ PORT: z.coerce.number().default(3000) })
    expect(out).toContain('number')
  })

  it('shows "default: 3000" in the comment', () => {
    const out = generateContent({ PORT: z.coerce.number().default(3000) })
    expect(out).toContain('default: 3000')
  })
})

describe('generateContent — required number (no default)', () => {
  it('produces an empty value for a required number', () => {
    const out = generateContent({ PORT: z.coerce.number() })
    expect(out).toContain('PORT=')
    expect(out).toContain('required')
  })
})

describe('generateContent — enum', () => {
  it('lists enum values in "a" | "b" | "c" format', () => {
    const out = generateContent({
      NODE_ENV: z.enum(['development', 'staging', 'production']),
    })
    expect(out).toContain('"development" | "staging" | "production"')
  })

  it('marks a required enum as required', () => {
    const out = generateContent({ NODE_ENV: z.enum(['a', 'b']) })
    expect(out).toContain('required')
  })
})

describe('generateContent — optional fields', () => {
  it('marks z.string().optional() as optional', () => {
    const out = generateContent({ SENTRY_DSN: z.string().optional() })
    expect(out).toContain('optional')
    expect(out).not.toContain('required')
  })

  it('marks z.string().url().optional() as optional with url type', () => {
    const out = generateContent({ SENTRY_DSN: z.string().url().optional() })
    expect(out).toContain('string (url)')
    expect(out).toContain('optional')
  })

  it('marks z.enum().optional() as optional', () => {
    const out = generateContent({ MODE: z.enum(['a', 'b']).optional() })
    expect(out).toContain('"a" | "b"')
    expect(out).toContain('optional')
  })
})

describe('generateContent — boolean with default', () => {
  it('uses "false" as the value when default is false', () => {
    const out = generateContent({ ENABLE_CACHE: z.coerce.boolean().default(false) })
    expect(out).toContain('ENABLE_CACHE=false')
  })

  it('uses "true" as the value when default is true', () => {
    const out = generateContent({ DEBUG: z.coerce.boolean().default(true) })
    expect(out).toContain('DEBUG=true')
  })

  it('shows "default: false" in the comment', () => {
    const out = generateContent({ ENABLE_CACHE: z.coerce.boolean().default(false) })
    expect(out).toContain('default: false')
  })

  it('labels the type as "boolean"', () => {
    const out = generateContent({ ENABLE_CACHE: z.coerce.boolean().default(false) })
    expect(out).toContain('boolean')
  })
})

describe('generateContent — string with default', () => {
  it('uses the default string as the line value', () => {
    const out = generateContent({ LOG_LEVEL: z.string().default('info') })
    expect(out).toContain('LOG_LEVEL=info')
  })

  it('shows "default: info" in the comment', () => {
    const out = generateContent({ LOG_LEVEL: z.string().default('info') })
    expect(out).toContain('default: info')
  })
})

describe('generateContent — multiple fields', () => {
  it('produces one line per schema key', () => {
    const out = generateContent({
      DATABASE_URL: z.string().url(),
      PORT: z.coerce.number().default(3000),
      NODE_ENV: z.enum(['development', 'staging', 'production']),
      SENTRY_DSN: z.string().url().optional(),
      ENABLE_CACHE: z.coerce.boolean().default(false),
    })
    const lines = out.trim().split('\n').filter((l) => !l.startsWith('#') && l.trim() !== '')
    expect(lines).toHaveLength(5)
  })

  it('preserves schema key insertion order', () => {
    const out = generateContent({
      AAA: z.string(),
      BBB: z.string(),
      CCC: z.string(),
    })
    const aIdx = out.indexOf('AAA=')
    const bIdx = out.indexOf('BBB=')
    const cIdx = out.indexOf('CCC=')
    expect(aIdx).toBeLessThan(bIdx)
    expect(bIdx).toBeLessThan(cIdx)
  })

  it('matches the full CLAUDE.md example output', () => {
    const out = generateContent({
      DATABASE_URL: z.string().url(),
      PORT: z.coerce.number().default(3000),
      NODE_ENV: z.enum(['development', 'staging', 'production']),
      SENTRY_DSN: z.string().url().optional(),
      ENABLE_CACHE: z.coerce.boolean().default(false),
    })
    expect(out).toContain('DATABASE_URL=')
    expect(out).toContain('string (url)')
    expect(out).toContain('required')
    expect(out).toContain('PORT=3000')
    expect(out).toContain('default: 3000')
    expect(out).toContain('"development" | "staging" | "production"')
    expect(out).toContain('SENTRY_DSN=')
    expect(out).toContain('optional')
    expect(out).toContain('ENABLE_CACHE=false')
    expect(out).toContain('default: false')
  })

  it('output ends with a newline', () => {
    const out = generateContent({ KEY: z.string() })
    expect(out.endsWith('\n')).toBe(true)
  })
})

// ── runGenerate ────────────────────────────────────────────────────────────

describe('runGenerate — file writing', () => {
  it('writes a .env.example file to the given outputPath', async () => {
    const outputPath = join(tmpdir(), `envcase-test-${Date.now()}.env.example`)
    const schema = {
      PORT: z.coerce.number().default(3000),
      DATABASE_URL: z.string().url(),
    }
    await runGenerate({ schema, outputPath })
    expect(existsSync(outputPath)).toBe(true)
  })

  it('written file content matches generateContent output', async () => {
    const outputPath = join(tmpdir(), `envcase-test-${Date.now()}.env.example`)
    const schema = {
      PORT: z.coerce.number().default(3000),
      DATABASE_URL: z.string().url(),
    }
    await runGenerate({ schema, outputPath })
    const content = readFileSync(outputPath, 'utf8')
    expect(content).toBe(generateContent(schema))
  })

  it('written file contains the key=value lines', async () => {
    const outputPath = join(tmpdir(), `envcase-test-${Date.now()}.env.example`)
    await runGenerate({
      schema: { MY_KEY: z.string().default('hello') },
      outputPath,
    })
    const content = readFileSync(outputPath, 'utf8')
    expect(content).toContain('MY_KEY=hello')
  })
})

// ── parseEnvFile ───────────────────────────────────────────────────────────
//
// parseEnvFile(content) parses .env file text into a plain key→value object.

describe('parseEnvFile', () => {
  it('parses a simple KEY=value line', () => {
    const result = parseEnvFile('PORT=3000')
    expect(result['PORT']).toBe('3000')
  })

  it('parses multiple lines', () => {
    const result = parseEnvFile('PORT=3000\nHOST=localhost')
    expect(result['PORT']).toBe('3000')
    expect(result['HOST']).toBe('localhost')
  })

  it('ignores comment lines starting with #', () => {
    const result = parseEnvFile('# this is a comment\nPORT=3000')
    expect(result['PORT']).toBe('3000')
    expect(Object.keys(result)).toHaveLength(1)
  })

  it('ignores blank lines', () => {
    const result = parseEnvFile('\n\nPORT=3000\n\n')
    expect(result['PORT']).toBe('3000')
    expect(Object.keys(result)).toHaveLength(1)
  })

  it('strips double-quoted values', () => {
    const result = parseEnvFile('DATABASE_URL="postgres://localhost/db"')
    expect(result['DATABASE_URL']).toBe('postgres://localhost/db')
  })

  it('strips single-quoted values', () => {
    const result = parseEnvFile("API_KEY='secret123'")
    expect(result['API_KEY']).toBe('secret123')
  })

  it('handles values containing = signs (splits on first = only)', () => {
    const result = parseEnvFile('DATABASE_URL=postgres://user:pass@host/db?ssl=true')
    expect(result['DATABASE_URL']).toBe('postgres://user:pass@host/db?ssl=true')
  })

  it('returns empty object for empty input', () => {
    expect(parseEnvFile('')).toEqual({})
  })

  it('trims whitespace around keys and values', () => {
    const result = parseEnvFile('  PORT = 3000  ')
    expect(result['PORT']).toBe('3000')
  })
})

// ── checkEnv ──────────────────────────────────────────────────────────────
//
// checkEnv(schema, source) validates a source object against a schema.
// Returns { valid, fields } — never throws.

describe('checkEnv — valid input', () => {
  it('returns valid: true when all required vars are present', () => {
    const result = checkEnv(
      { PORT: z.coerce.number(), HOST: z.string() },
      { PORT: '3000', HOST: 'localhost' }
    )
    expect(result.valid).toBe(true)
    expect(result.fields).toHaveLength(0)
  })

  it('returns valid: true when optional vars are absent', () => {
    const result = checkEnv(
      { PORT: z.coerce.number(), SENTRY_DSN: z.string().optional() },
      { PORT: '3000' }
    )
    expect(result.valid).toBe(true)
  })

  it('returns valid: true when vars with defaults are absent', () => {
    const result = checkEnv(
      { PORT: z.coerce.number().default(3000) },
      {}
    )
    expect(result.valid).toBe(true)
  })
})

describe('checkEnv — invalid input', () => {
  it('returns valid: false when a required var is missing', () => {
    const result = checkEnv({ PORT: z.coerce.number() }, {})
    expect(result.valid).toBe(false)
  })

  it('returns the missing field in fields array', () => {
    const result = checkEnv({ DATABASE_URL: z.string() }, {})
    expect(result.fields).toHaveLength(1)
    expect(result.fields[0].key).toBe('DATABASE_URL')
    expect(result.fields[0].kind).toBe('missing')
  })

  it('returns valid: false when a var has the wrong type/value', () => {
    const result = checkEnv(
      { NODE_ENV: z.enum(['development', 'production']) },
      { NODE_ENV: 'prod' }
    )
    expect(result.valid).toBe(false)
    expect(result.fields[0].key).toBe('NODE_ENV')
    expect(result.fields[0].kind).toBe('invalid')
  })

  it('collects all failing fields', () => {
    const result = checkEnv(
      { A: z.string(), B: z.string(), C: z.string() },
      {}
    )
    expect(result.fields).toHaveLength(3)
    expect(result.fields.map((f) => f.key)).toEqual(['A', 'B', 'C'])
  })
})

// ── formatCheckResult ─────────────────────────────────────────────────────

describe('formatCheckResult — valid', () => {
  it('contains ✅ for a passing result', () => {
    const out = formatCheckResult({ valid: true, fields: [] })
    expect(out).toContain('✅')
  })

  it('contains "All environment variables are valid" for a passing result', () => {
    const out = formatCheckResult({ valid: true, fields: [] })
    expect(out).toContain('All environment variables are valid')
  })

  it('does not contain ❌ for a passing result', () => {
    const out = formatCheckResult({ valid: true, fields: [] })
    expect(out).not.toContain('❌')
  })
})

describe('formatCheckResult — invalid', () => {
  it('contains ❌ for a failing result', () => {
    const out = formatCheckResult({
      valid: false,
      fields: [{ key: 'PORT', message: 'Required but missing', kind: 'missing' }],
    })
    expect(out).toContain('❌')
  })

  it('contains "Validation failed" for a failing result', () => {
    const out = formatCheckResult({
      valid: false,
      fields: [{ key: 'PORT', message: 'Required but missing', kind: 'missing' }],
    })
    expect(out).toContain('Validation failed')
  })

  it('lists the field key in the output', () => {
    const out = formatCheckResult({
      valid: false,
      fields: [{ key: 'NODE_ENV', message: 'Expected "a" | "b", got "c"', kind: 'invalid' }],
    })
    expect(out).toContain('NODE_ENV')
  })

  it('includes the field message in the output', () => {
    const out = formatCheckResult({
      valid: false,
      fields: [{ key: 'NODE_ENV', message: 'Expected "a" | "b", got "c"', kind: 'invalid' }],
    })
    expect(out).toContain('Expected "a" | "b", got "c"')
  })

  it('lists all failing fields', () => {
    const out = formatCheckResult({
      valid: false,
      fields: [
        { key: 'PORT', message: 'Required but missing', kind: 'missing' },
        { key: 'HOST', message: 'Required but missing', kind: 'missing' },
      ],
    })
    expect(out).toContain('PORT')
    expect(out).toContain('HOST')
  })
})

// ── runCheck ──────────────────────────────────────────────────────────────
//
// runCheck({ schema, envPath }) reads a .env file from disk and validates it.

describe('runCheck — file-based validation', () => {
  it('returns valid: true when .env contains all required vars', async () => {
    const envPath = join(tmpdir(), `envcase-check-${Date.now()}.env`)
    writeFileSync(envPath, 'PORT=3000\nHOST=localhost')
    const result = await runCheck({
      schema: { PORT: z.coerce.number(), HOST: z.string() },
      envPath,
    })
    expect(result.valid).toBe(true)
  })

  it('returns valid: false when .env is missing a required var', async () => {
    const envPath = join(tmpdir(), `envcase-check-${Date.now()}.env`)
    writeFileSync(envPath, 'PORT=3000')
    const result = await runCheck({
      schema: { PORT: z.coerce.number(), DATABASE_URL: z.string().url() },
      envPath,
    })
    expect(result.valid).toBe(false)
    expect(result.fields[0].key).toBe('DATABASE_URL')
  })

  it('returns valid: false when .env has an invalid value', async () => {
    const envPath = join(tmpdir(), `envcase-check-${Date.now()}.env`)
    writeFileSync(envPath, 'NODE_ENV=prod')
    const result = await runCheck({
      schema: { NODE_ENV: z.enum(['development', 'production']) },
      envPath,
    })
    expect(result.valid).toBe(false)
  })

  it('returns valid: true when envPath does not exist but all fields have defaults', async () => {
    const envPath = join(tmpdir(), `envcase-check-nonexistent-${Date.now()}.env`)
    const result = await runCheck({
      schema: { PORT: z.coerce.number().default(3000) },
      envPath,
    })
    expect(result.valid).toBe(true)
  })
})

// ── parseExampleFile ───────────────────────────────────────────────────────
//
// parseExampleFile(content) reads .env.example text (as produced by generateContent)
// and returns ExampleEntry[] with key and status metadata from the comment.

describe('parseExampleFile', () => {
  it('parses a required entry', () => {
    const entries = parseExampleFile('DATABASE_URL=  # string (url) — required')
    expect(entries).toHaveLength(1)
    expect(entries[0].key).toBe('DATABASE_URL')
    expect(entries[0].status).toEqual({ kind: 'required' })
  })

  it('parses an optional entry', () => {
    const entries = parseExampleFile('SENTRY_DSN=  # string (url) — optional')
    expect(entries[0].key).toBe('SENTRY_DSN')
    expect(entries[0].status).toEqual({ kind: 'optional' })
  })

  it('parses a default entry and captures the default value', () => {
    const entries = parseExampleFile('PORT=3000  # number — default: 3000')
    expect(entries[0].key).toBe('PORT')
    expect(entries[0].status).toEqual({ kind: 'default', value: '3000' })
  })

  it('parses a boolean-false default', () => {
    const entries = parseExampleFile('ENABLE_CACHE=false  # boolean — default: false')
    expect(entries[0].key).toBe('ENABLE_CACHE')
    expect(entries[0].status).toEqual({ kind: 'default', value: 'false' })
  })

  it('ignores comment lines starting with #', () => {
    const entries = parseExampleFile('# Generated by envcase\nPORT=3000  # number — default: 3000')
    expect(entries).toHaveLength(1)
    expect(entries[0].key).toBe('PORT')
  })

  it('ignores blank lines', () => {
    const entries = parseExampleFile('\nPORT=3000  # number — default: 3000\n\n')
    expect(entries).toHaveLength(1)
  })

  it('returns multiple entries in insertion order', () => {
    const content = [
      'DATABASE_URL=  # string (url) — required',
      'PORT=3000  # number — default: 3000',
      'NODE_ENV=  # "development" | "staging" — required',
    ].join('\n')
    const entries = parseExampleFile(content)
    expect(entries).toHaveLength(3)
    expect(entries.map((e) => e.key)).toEqual(['DATABASE_URL', 'PORT', 'NODE_ENV'])
  })

  it('returns empty array for empty input', () => {
    expect(parseExampleFile('')).toEqual([])
  })

  it('round-trips with generateContent', () => {
    const schema = {
      DATABASE_URL: z.string().url(),
      PORT: z.coerce.number().default(3000),
      SENTRY_DSN: z.string().url().optional(),
      ENABLE_CACHE: z.coerce.boolean().default(false),
    }
    const exampleContent = generateContent(schema)
    const entries = parseExampleFile(exampleContent)
    expect(entries.map((e) => e.key)).toEqual(['DATABASE_URL', 'PORT', 'SENTRY_DSN', 'ENABLE_CACHE'])
    expect(entries[0].status).toEqual({ kind: 'required' })
    expect(entries[1].status).toEqual({ kind: 'default', value: '3000' })
    expect(entries[2].status).toEqual({ kind: 'optional' })
    expect(entries[3].status).toEqual({ kind: 'default', value: 'false' })
  })
})

// ── diffEnv ────────────────────────────────────────────────────────────────
//
// diffEnv(entries, envKeys) returns entries whose keys are absent from envKeys.

describe('diffEnv', () => {
  const entries = [
    { key: 'DATABASE_URL', status: { kind: 'required' } as const },
    { key: 'PORT', status: { kind: 'default', value: '3000' } as const },
    { key: 'SENTRY_DSN', status: { kind: 'optional' } as const },
  ]

  it('returns empty array when all example keys are present in env', () => {
    const envKeys = new Set(['DATABASE_URL', 'PORT', 'SENTRY_DSN'])
    expect(diffEnv(entries, envKeys)).toHaveLength(0)
  })

  it('returns missing entries when keys are absent from env', () => {
    const envKeys = new Set(['DATABASE_URL'])
    const missing = diffEnv(entries, envKeys)
    expect(missing).toHaveLength(2)
    expect(missing.map((e) => e.key)).toEqual(['PORT', 'SENTRY_DSN'])
  })

  it('considers a key present even when its .env value is empty string', () => {
    const envKeys = new Set(['DATABASE_URL', 'PORT', 'SENTRY_DSN'])
    expect(diffEnv(entries, envKeys)).toHaveLength(0)
  })

  it('includes required, optional, and default entries when all are missing', () => {
    const missing = diffEnv(entries, new Set())
    expect(missing.map((e) => e.key)).toEqual(['DATABASE_URL', 'PORT', 'SENTRY_DSN'])
  })

  it('preserves the status of each missing entry', () => {
    const missing = diffEnv(entries, new Set())
    expect(missing[0].status).toEqual({ kind: 'required' })
    expect(missing[1].status).toEqual({ kind: 'default', value: '3000' })
    expect(missing[2].status).toEqual({ kind: 'optional' })
  })

  it('returns empty array when entries list is empty', () => {
    expect(diffEnv([], new Set(['ANYTHING']))).toHaveLength(0)
  })
})

// ── formatDiffResult ───────────────────────────────────────────────────────

describe('formatDiffResult — no missing vars', () => {
  it('contains ✅ when nothing is missing', () => {
    const out = formatDiffResult({ missing: [] })
    expect(out).toContain('✅')
  })

  it('indicates nothing is missing', () => {
    const out = formatDiffResult({ missing: [] })
    expect(out.toLowerCase()).toMatch(/nothing missing|up to date|matches/)
  })

  it('does not contain ⚠️ when nothing is missing', () => {
    const out = formatDiffResult({ missing: [] })
    expect(out).not.toContain('⚠️')
  })
})

describe('formatDiffResult — missing vars', () => {
  it('contains ⚠️ when vars are missing', () => {
    const out = formatDiffResult({
      missing: [{ key: 'PORT', status: { kind: 'required' } }],
    })
    expect(out).toContain('⚠️')
  })

  it('says "missing 1 variable" for a single missing entry', () => {
    const out = formatDiffResult({
      missing: [{ key: 'PORT', status: { kind: 'required' } }],
    })
    expect(out).toContain('missing 1 variable')
  })

  it('says "missing 2 variables" for two missing entries', () => {
    const out = formatDiffResult({
      missing: [
        { key: 'A', status: { kind: 'required' } },
        { key: 'B', status: { kind: 'optional' } },
      ],
    })
    expect(out).toContain('missing 2 variables')
  })

  it('shows "(optional)" annotation for optional entries', () => {
    const out = formatDiffResult({
      missing: [{ key: 'SENTRY_DSN', status: { kind: 'optional' } }],
    })
    expect(out).toContain('(optional)')
  })

  it('shows "(has default: X)" annotation for default entries', () => {
    const out = formatDiffResult({
      missing: [{ key: 'PORT', status: { kind: 'default', value: '3000' } }],
    })
    expect(out).toContain('(has default: 3000)')
  })

  it('shows "(required)" annotation for required entries', () => {
    const out = formatDiffResult({
      missing: [{ key: 'DATABASE_URL', status: { kind: 'required' } }],
    })
    expect(out).toContain('(required)')
  })

  it('lists the key name in the output', () => {
    const out = formatDiffResult({
      missing: [{ key: 'MY_SECRET', status: { kind: 'required' } }],
    })
    expect(out).toContain('MY_SECRET')
  })

  it('contains "Run `npx envcase check`" hint', () => {
    const out = formatDiffResult({
      missing: [{ key: 'A', status: { kind: 'required' } }],
    })
    expect(out).toContain('npx envcase check')
  })

  it('lists all missing entries', () => {
    const out = formatDiffResult({
      missing: [
        { key: 'SENTRY_DSN', status: { kind: 'optional' } },
        { key: 'ENABLE_CACHE', status: { kind: 'default', value: 'false' } },
      ],
    })
    expect(out).toContain('SENTRY_DSN')
    expect(out).toContain('(optional)')
    expect(out).toContain('ENABLE_CACHE')
    expect(out).toContain('(has default: false)')
  })
})

// ── runDiff ────────────────────────────────────────────────────────────────

describe('runDiff — file-based comparison', () => {
  it('returns empty missing when .env contains all .env.example keys', async () => {
    const examplePath = join(tmpdir(), `${Date.now()}.env.example`)
    const envPath = join(tmpdir(), `${Date.now()}.env`)
    writeFileSync(examplePath, generateContent({ PORT: z.coerce.number().default(3000), HOST: z.string() }))
    writeFileSync(envPath, 'PORT=3000\nHOST=localhost')
    const result = await runDiff({ examplePath, envPath })
    expect(result.missing).toHaveLength(0)
  })

  it('returns missing entries when .env lacks keys from .env.example', async () => {
    const examplePath = join(tmpdir(), `${Date.now()}.env.example`)
    const envPath = join(tmpdir(), `${Date.now()}.env`)
    writeFileSync(
      examplePath,
      generateContent({ PORT: z.coerce.number().default(3000), DATABASE_URL: z.string().url() })
    )
    writeFileSync(envPath, 'PORT=3000')
    const result = await runDiff({ examplePath, envPath })
    expect(result.missing).toHaveLength(1)
    expect(result.missing[0].key).toBe('DATABASE_URL')
  })

  it('returns all example entries as missing when .env does not exist', async () => {
    const examplePath = join(tmpdir(), `${Date.now()}.env.example`)
    const envPath = join(tmpdir(), `nonexistent-${Date.now()}.env`)
    writeFileSync(examplePath, generateContent({ A: z.string(), B: z.string() }))
    const result = await runDiff({ examplePath, envPath })
    expect(result.missing.map((e) => e.key)).toEqual(['A', 'B'])
  })

  it('returns empty missing when .env.example does not exist', async () => {
    const examplePath = join(tmpdir(), `nonexistent-${Date.now()}.env.example`)
    const envPath = join(tmpdir(), `${Date.now()}.env`)
    writeFileSync(envPath, 'PORT=3000')
    const result = await runDiff({ examplePath, envPath })
    expect(result.missing).toHaveLength(0)
  })

  it('preserves status metadata from .env.example in missing entries', async () => {
    const examplePath = join(tmpdir(), `${Date.now()}.env.example`)
    const envPath = join(tmpdir(), `nonexistent-${Date.now()}.env`)
    writeFileSync(
      examplePath,
      generateContent({
        PORT: z.coerce.number().default(3000),
        SENTRY_DSN: z.string().url().optional(),
      })
    )
    const result = await runDiff({ examplePath, envPath })
    const port = result.missing.find((e) => e.key === 'PORT')
    const sentry = result.missing.find((e) => e.key === 'SENTRY_DSN')
    expect(port?.status).toEqual({ kind: 'default', value: '3000' })
    expect(sentry?.status).toEqual({ kind: 'optional' })
  })
})
