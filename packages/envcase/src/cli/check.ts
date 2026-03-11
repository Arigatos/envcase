import { readFile } from 'node:fs/promises'
import { z } from 'zod'
import { defineEnv } from '../define.js'
import { EnvCaseError, type FieldError } from '../errors.js'

// ── .env file parser ──────────────────────────────────────────────────────

/**
 * Parse the text content of a `.env` file into a plain key→value object.
 * Ignores comment lines and blank lines. Strips surrounding quotes.
 * Splits on the first `=` only, so values may contain `=`.
 */
export function parseEnvFile(content: string): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {}
  for (const raw of content.split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eqIdx = line.indexOf('=')
    if (eqIdx === -1) continue
    const key = line.slice(0, eqIdx).trim()
    let value = line.slice(eqIdx + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    result[key] = value
  }
  return result
}

// ── Check result ──────────────────────────────────────────────────────────

export interface CheckResult {
  valid: boolean
  fields: FieldError[]
}

/**
 * Validate a plain source object against a Zod schema record.
 * Never throws — returns `{ valid, fields }`.
 */
export function checkEnv(
  schema: Record<string, z.ZodTypeAny>,
  source: Record<string, string | undefined>
): CheckResult {
  try {
    defineEnv(schema, { source })
    return { valid: true, fields: [] }
  } catch (err) {
    if (err instanceof EnvCaseError) {
      return { valid: false, fields: err.fields }
    }
    throw err
  }
}

// ── Output formatting ─────────────────────────────────────────────────────

/**
 * Format a `CheckResult` as a human-readable string suitable for printing.
 */
export function formatCheckResult(result: CheckResult): string {
  if (result.valid) {
    return '[envcase] ✅ All environment variables are valid.'
  }

  const lines: string[] = ['[envcase] ❌ Validation failed:']
  for (const { key, message } of result.fields) {
    lines.push(`  ${key} → ${message}`)
  }
  return lines.join('\n')
}

// ── I/O layer ─────────────────────────────────────────────────────────────

export interface RunCheckOptions {
  /** The Zod schema record to validate against. */
  schema: Record<string, z.ZodTypeAny>
  /** Path to the `.env` file to read. Defaults to '.env'. */
  envPath?: string
}

/**
 * Read a `.env` file from disk, validate it against the schema, and return
 * a `CheckResult`. If the file does not exist, validates against an empty source
 * (fields with defaults will still pass).
 */
export async function runCheck(options: RunCheckOptions): Promise<CheckResult> {
  const { schema, envPath = '.env' } = options

  let source: Record<string, string | undefined> = {}
  try {
    const content = await readFile(envPath, 'utf8')
    source = parseEnvFile(content)
  } catch {
    // File doesn't exist — validate against empty source so defaults still pass
  }

  return checkEnv(schema, source)
}
