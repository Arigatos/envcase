import { writeFile } from 'node:fs/promises'
import { z } from 'zod'

// ── Schema introspection ──────────────────────────────────────────────────

interface SchemaInfo {
  baseType: 'string' | 'number' | 'boolean' | 'enum' | 'unknown'
  isUrl: boolean
  enumValues: string[]
  isOptional: boolean
  hasDefault: boolean
  defaultValue: unknown
}

/**
 * Returns the type identifier for a Zod schema def, compatible with v3 and v4.
 * v3: def.typeName (e.g. "ZodBoolean"), v4: def.type (e.g. "boolean")
 */
function getZodTypeName(def: Record<string, unknown>): string {
  return (def['type'] ?? def['typeName']) as string
}

/**
 * Reads the default value from a ZodDefault def, compatible with v3 and v4.
 * v3: def.defaultValue is a function — must be called.
 * v4: def.defaultValue is the direct value — must NOT be called.
 */
function getDefaultValue(def: Record<string, unknown>): unknown {
  const raw = def['defaultValue']
  return typeof raw === 'function' ? raw() : raw
}

/**
 * Reads enum values from a ZodEnum def, compatible with v3 and v4.
 * v3: def.values is an array.
 * v4: def.entries is an object — use Object.values().
 */
function getEnumValues(def: Record<string, unknown>): string[] {
  if (Array.isArray(def['values'])) return def['values'] as string[]
  if (def['entries']) return Object.values(def['entries'] as Record<string, string>)
  return []
}

/**
 * Detects whether a string schema has a URL validation, compatible with v3 and v4.
 * v3: def.checks contains { kind: 'url' }
 * v4 (z.string().url()): def.checks contains { _zod: { def: { check: 'string_format', format: 'url' } } }
 * v4 (z.url()): schema itself has _zod.def.format === 'url'
 */
function isUrlString(validator: z.ZodTypeAny, def: Record<string, unknown>): boolean {
  const checks = (def['checks'] as Array<Record<string, unknown>>) ?? []

  // v3: { kind: 'url' }
  if (checks.some((c) => c['kind'] === 'url')) return true

  // v4 z.string().url(): { _zod: { def: { check: 'string_format', format: 'url' } } }
  if (
    checks.some((c) => {
      const zodDef = (c['_zod'] as Record<string, unknown> | undefined)?.['def'] as
        | Record<string, unknown>
        | undefined
      return zodDef?.['check'] === 'string_format' && zodDef?.['format'] === 'url'
    })
  )
    return true

  // v4 z.url(): the schema itself carries _zod.def.format === 'url'
  const schemaDef = (
    (validator as unknown as Record<string, unknown>)['_zod'] as Record<string, unknown> | undefined
  )?.['def'] as Record<string, unknown> | undefined
  return schemaDef?.['format'] === 'url'
}

function inspectSchema(validator: z.ZodTypeAny): SchemaInfo {
  const def = validator._def as Record<string, unknown>
  const typeName = getZodTypeName(def)

  // Unwrap ZodDefault — v3: "ZodDefault", v4: "default"
  if (typeName === 'ZodDefault' || typeName === 'default') {
    const inner = inspectSchema(def['innerType'] as z.ZodTypeAny)
    return { ...inner, hasDefault: true, defaultValue: getDefaultValue(def) }
  }

  // Unwrap ZodOptional — v3: "ZodOptional", v4: "optional"
  if (typeName === 'ZodOptional' || typeName === 'optional') {
    const inner = inspectSchema(def['innerType'] as z.ZodTypeAny)
    return { ...inner, isOptional: true }
  }

  // Unwrap ZodNullable — v3: "ZodNullable", v4: "nullable"
  if (typeName === 'ZodNullable' || typeName === 'nullable') {
    const inner = inspectSchema(def['innerType'] as z.ZodTypeAny)
    return { ...inner, isOptional: true }
  }

  const base: Omit<SchemaInfo, 'baseType' | 'isUrl' | 'enumValues'> = {
    isOptional: false,
    hasDefault: false,
    defaultValue: undefined,
  }

  // v3: "ZodString", v4: "string"
  if (typeName === 'ZodString' || typeName === 'string') {
    return { ...base, baseType: 'string', isUrl: isUrlString(validator, def), enumValues: [] }
  }

  // v3: "ZodNumber", v4: "number"
  if (typeName === 'ZodNumber' || typeName === 'number') {
    return { ...base, baseType: 'number', isUrl: false, enumValues: [] }
  }

  // v3: "ZodBoolean", v4: "boolean"
  if (typeName === 'ZodBoolean' || typeName === 'boolean') {
    return { ...base, baseType: 'boolean', isUrl: false, enumValues: [] }
  }

  // v3: "ZodEnum" with def.values, v4: "enum" with def.entries
  if (typeName === 'ZodEnum' || typeName === 'enum') {
    return { ...base, baseType: 'enum', isUrl: false, enumValues: getEnumValues(def) }
  }

  return { ...base, baseType: 'unknown', isUrl: false, enumValues: [] }
}

// ── Line formatting ───────────────────────────────────────────────────────

function formatLine(key: string, info: SchemaInfo): string {
  const value = info.hasDefault ? String(info.defaultValue) : ''

  let typeDesc: string
  if (info.baseType === 'enum') {
    typeDesc = info.enumValues.map((v) => `"${v}"`).join(' | ')
  } else if (info.baseType === 'string' && info.isUrl) {
    typeDesc = 'string (url)'
  } else {
    typeDesc = info.baseType
  }

  let status: string
  if (info.isOptional) {
    status = 'optional'
  } else if (info.hasDefault) {
    status = `default: ${info.defaultValue}`
  } else {
    status = 'required'
  }

  return `${key}=${value}  # ${typeDesc} — ${status}`
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Generate the string content for a `.env.example` file from a Zod schema record.
 * Each key produces one line: `KEY=<default>  # <type> — <required|optional|default: X>`
 */
export function generateContent(schema: Record<string, z.ZodTypeAny>): string {
  const lines: string[] = []
  for (const [key, validator] of Object.entries(schema)) {
    const info = inspectSchema(validator)
    lines.push(formatLine(key, info))
  }
  return lines.join('\n') + '\n'
}

export interface RunGenerateOptions {
  /** The Zod schema record to generate from. */
  schema: Record<string, z.ZodTypeAny>
  /** Path to write the .env.example file. Defaults to '.env.example'. */
  outputPath?: string
}

/**
 * Write a `.env.example` file generated from the given Zod schema.
 */
export async function runGenerate(options: RunGenerateOptions): Promise<void> {
  const { schema, outputPath = '.env.example' } = options
  const content = generateContent(schema)
  await writeFile(outputPath, content, 'utf8')
  console.log(`[envcase] ✅ Generated ${outputPath}`)
}
