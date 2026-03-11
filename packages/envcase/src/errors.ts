export type FieldErrorKind = 'missing' | 'invalid'

/** A single field-level validation failure. */
export interface FieldError {
  key: string
  message: string
  kind: FieldErrorKind
  /**
   * For `kind: 'missing'` fields: the value hint shown in the .env.example block.
   * e.g. `"development|staging|production"` for an enum, omit for a plain string.
   */
  envHint?: string
}

/**
 * Thrown when environment variable validation fails.
 * Includes human-readable, actionable error messages.
 */
export class EnvCaseError extends Error {
  readonly fields: FieldError[]

  constructor(fields: FieldError[]) {
    super(EnvCaseError.format(fields))
    this.name = 'EnvCaseError'
    this.fields = fields
  }

  private static format(fields: FieldError[]): string {
    const lines: string[] = ['[envcase] Environment validation failed:\n']

    // ── field list ──────────────────────────────────────────────────────────
    for (const { key, message } of fields) {
      lines.push(`  ❌ ${key.padEnd(14)} → ${message}`)
    }

    const missing = fields.filter((f) => f.kind === 'missing')
    const invalid = fields.filter((f) => f.kind === 'invalid')

    // ── missing-vars hint ───────────────────────────────────────────────────
    if (missing.length > 0) {
      lines.push('')
      lines.push('  💡 Add these to your .env file:\n')
      for (const { key, envHint } of missing) {
        lines.push(`     ${key}=${envHint ?? ''}`)
      }
      lines.push('')
      lines.push('  Run `npx envcase generate` to auto-create a .env.example')
    }

    // ── wrong-type hint ─────────────────────────────────────────────────────
    if (invalid.length > 0) {
      lines.push('')
      lines.push('  💡 Check your .env file and fix the values above.')
    }

    return lines.join('\n')
  }
}
