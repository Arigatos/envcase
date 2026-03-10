/** A single field-level validation failure. */
export interface FieldError {
  key: string
  message: string
}

/**
 * Thrown when environment variable validation fails.
 * Includes human-readable error messages with actionable hints.
 */
export class EnvCaseError extends Error {
  readonly fields: FieldError[]

  constructor(fields: FieldError[]) {
    super(EnvCaseError.format(fields))
    this.name = 'EnvCaseError'
    this.fields = fields
  }

  private static format(fields: FieldError[]): string {
    const lines = ['[envcase] Environment validation failed:\n']
    for (const { key, message } of fields) {
      lines.push(`  \u274c ${key.padEnd(20)} \u2192 ${message}`)
    }
    lines.push('\n  \ud83d\udca1 Fix the values above in your .env file.')
    lines.push('  Run `npx envcase generate` to auto-create a .env.example')
    return lines.join('\n')
  }
}
