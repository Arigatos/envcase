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

function inspectSchema(validator: z.ZodTypeAny): SchemaInfo {
  const def = validator._def as Record<string, unknown>
  const typeName = def['typeName'] as string

  // Unwrap ZodDefault
  if (typeName === z.ZodFirstPartyTypeKind.ZodDefault) {
    const inner = inspectSchema(def['innerType'] as z.ZodTypeAny)
    return {
      ...inner,
      hasDefault: true,
      defaultValue: (def['defaultValue'] as () => unknown)(),
    }
  }

  // Unwrap ZodOptional
  if (typeName === z.ZodFirstPartyTypeKind.ZodOptional) {
    const inner = inspectSchema(def['innerType'] as z.ZodTypeAny)
    return { ...inner, isOptional: true }
  }

  // Unwrap ZodNullable
  if (typeName === z.ZodFirstPartyTypeKind.ZodNullable) {
    const inner = inspectSchema(def['innerType'] as z.ZodTypeAny)
    return { ...inner, isOptional: true }
  }

  const base: Omit<SchemaInfo, 'baseType' | 'isUrl' | 'enumValues'> = {
    isOptional: false,
    hasDefault: false,
    defaultValue: undefined,
  }

  if (typeName === z.ZodFirstPartyTypeKind.ZodString) {
    const checks = (def['checks'] as Array<{ kind: string }>) ?? []
    const isUrl = checks.some((c) => c.kind === 'url')
    return { ...base, baseType: 'string', isUrl, enumValues: [] }
  }

  if (typeName === z.ZodFirstPartyTypeKind.ZodNumber) {
    return { ...base, baseType: 'number', isUrl: false, enumValues: [] }
  }

  if (typeName === z.ZodFirstPartyTypeKind.ZodBoolean) {
    return { ...base, baseType: 'boolean', isUrl: false, enumValues: [] }
  }

  if (typeName === z.ZodFirstPartyTypeKind.ZodEnum) {
    const values = (def['values'] as string[]) ?? []
    return { ...base, baseType: 'enum', isUrl: false, enumValues: values }
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
