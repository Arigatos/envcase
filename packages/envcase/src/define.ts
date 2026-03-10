import { z } from 'zod'
import { EnvCaseError, type FieldError } from './errors.js'
import { nodeAdapter } from './adapters/node.js'

/**
 * Detect whether a Zod type (including wrapped types like Default/Optional)
 * will coerce a value to boolean, so we can preprocess "false"/"0" correctly.
 * Zod's Boolean() coercion treats any non-empty string as true.
 */
function isCoerceBoolean(validator: z.ZodTypeAny): boolean {
  const def = validator._def as Record<string, unknown>
  if (def['typeName'] === z.ZodFirstPartyTypeKind.ZodBoolean && def['coerce'] === true) {
    return true
  }
  // Unwrap ZodDefault / ZodOptional / ZodNullable
  const inner = (def['innerType'] ?? def['schema']) as z.ZodTypeAny | undefined
  return inner != null ? isCoerceBoolean(inner) : false
}

/** Convert env-style boolean strings before Zod coercion. */
function preprocessBoolean(value: string | undefined): boolean | string | undefined {
  if (value === 'false' || value === '0') return false
  if (value === 'true' || value === '1') return true
  return value
}

/**
 * Infers the output type from a Zod schema record.
 * Each key maps to the inferred TypeScript type of its Zod validator.
 */
export type InferEnv<T extends Record<string, z.ZodTypeAny>> = {
  [K in keyof T]: z.infer<T[K]>
}

export interface DefineEnvOptions {
  /** Which runtime adapter to use. Defaults to auto-detect. */
  adapter?: 'node' | 'vite' | 'deno' | 'custom'
  /** Custom env source for 'custom' adapter. */
  source?: Record<string, string | undefined>
  /** Strip a prefix from all keys (e.g. "VITE_" or "NEXT_PUBLIC_"). */
  prefix?: string
  /** Behaviour on validation error. Defaults to 'throw'. */
  onError?: 'throw' | 'warn' | 'silent'
}

function humanizeZodIssue(issue: z.ZodIssue): string {
  if (issue.code === 'invalid_type' && issue.received === 'undefined') {
    return 'Required but missing'
  }
  if (issue.code === 'invalid_type') {
    return `Expected ${issue.expected}, got "${issue.received}"`
  }
  if (issue.code === 'invalid_enum_value') {
    return `Expected ${issue.options.map((o) => `"${o}"`).join(' | ')}, got "${issue.received}"`
  }
  return issue.message
}

/**
 * Define and validate environment variables against a Zod schema.
 * Returns a fully-typed, frozen object containing the parsed values.
 *
 * @param schema - Record of Zod validators keyed by env var name.
 * @param options - Optional configuration (adapter, prefix, onError, etc.).
 */
export function defineEnv<T extends Record<string, z.ZodTypeAny>>(
  schema: T,
  options?: DefineEnvOptions
): InferEnv<T> {
  const { source, prefix, onError = 'throw' } = options ?? {}

  // Resolve env source
  const raw: Record<string, string | undefined> = source ?? nodeAdapter()

  // Build input object, stripping prefix from source keys when set
  const input: Record<string, string | undefined> = {}
  for (const key of Object.keys(schema)) {
    const sourceKey = prefix ? `${prefix}${key}` : key
    input[key] = raw[sourceKey]
  }

  // Validate each field individually to collect all errors at once
  const fieldErrors: FieldError[] = []
  const parsed: Record<string, unknown> = {}

  for (const [key, validator] of Object.entries(schema)) {
    const rawValue = isCoerceBoolean(validator)
      ? preprocessBoolean(input[key])
      : input[key]
    const result = validator.safeParse(rawValue)
    if (result.success) {
      parsed[key] = result.data
    } else {
      const firstIssue = result.error.issues[0]
      fieldErrors.push({ key, message: humanizeZodIssue(firstIssue) })
    }
  }

  if (fieldErrors.length > 0) {
    const error = new EnvCaseError(fieldErrors)
    if (onError === 'throw') throw error
    if (onError === 'warn') console.warn(error.message)
    // 'silent': do nothing
    return parsed as InferEnv<T>
  }

  return Object.freeze(parsed) as InferEnv<T>
}
