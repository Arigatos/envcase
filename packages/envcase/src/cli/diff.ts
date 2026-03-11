import { readFile } from 'node:fs/promises'
import { parseEnvFile } from './check.js'

// ── Types ─────────────────────────────────────────────────────────────────

export type EntryStatus =
  | { kind: 'required' }
  | { kind: 'optional' }
  | { kind: 'default'; value: string }

export interface ExampleEntry {
  key: string
  status: EntryStatus
}

export interface DiffResult {
  missing: ExampleEntry[]
}

// ── .env.example parser ───────────────────────────────────────────────────

/**
 * Parse `.env.example` content (as produced by `generateContent`) into an
 * array of `ExampleEntry` objects, extracting status metadata from each
 * line's inline comment (`— required`, `— optional`, `— default: X`).
 */
export function parseExampleFile(content: string): ExampleEntry[] {
  const entries: ExampleEntry[] = []

  for (const raw of content.split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue

    const eqIdx = line.indexOf('=')
    if (eqIdx === -1) continue
    const key = line.slice(0, eqIdx).trim()

    // Extract status from comment after the em-dash separator (— status)
    const hashIdx = line.indexOf('#')
    const comment = hashIdx !== -1 ? line.slice(hashIdx + 1).trim() : ''
    const dashIdx = comment.lastIndexOf('—')
    const statusStr = dashIdx !== -1 ? comment.slice(dashIdx + 1).trim() : ''

    let status: EntryStatus
    if (statusStr === 'optional') {
      status = { kind: 'optional' }
    } else if (statusStr.startsWith('default:')) {
      status = { kind: 'default', value: statusStr.slice('default:'.length).trim() }
    } else {
      status = { kind: 'required' }
    }

    entries.push({ key, status })
  }

  return entries
}

// ── Diff logic ────────────────────────────────────────────────────────────

/**
 * Return the entries from `entries` whose keys are absent from `envKeys`.
 * Key presence is determined purely by key existence — an empty value counts as present.
 */
export function diffEnv(entries: ExampleEntry[], envKeys: Set<string>): ExampleEntry[] {
  return entries.filter((e) => !envKeys.has(e.key))
}

// ── Output formatting ─────────────────────────────────────────────────────

/**
 * Format a `DiffResult` as a human-readable string suitable for printing.
 */
export function formatDiffResult(result: DiffResult): string {
  if (result.missing.length === 0) {
    return '[envcase] ✅ Your .env matches .env.example — nothing missing.'
  }

  const n = result.missing.length
  const noun = n === 1 ? 'variable' : 'variables'
  const lines: string[] = [
    `[envcase] ⚠️  Your .env is missing ${n} ${noun} from .env.example:`,
    '',
  ]

  for (const { key, status } of result.missing) {
    let annotation: string
    if (status.kind === 'optional') {
      annotation = '(optional)'
    } else if (status.kind === 'default') {
      annotation = `(has default: ${status.value})`
    } else {
      annotation = '(required)'
    }
    lines.push(`  + ${key}  ${annotation}`)
  }

  lines.push('')
  lines.push('  Run `npx envcase check` to validate current values.')
  return lines.join('\n')
}

// ── I/O layer ─────────────────────────────────────────────────────────────

export interface RunDiffOptions {
  /** Path to the `.env.example` reference file. Defaults to '.env.example'. */
  examplePath?: string
  /** Path to the `.env` file to compare. Defaults to '.env'. */
  envPath?: string
}

/**
 * Compare `.env` against `.env.example` and return a `DiffResult` listing
 * keys that are present in `.env.example` but absent from `.env`.
 * Missing files are treated as empty (no entries / no keys).
 */
export async function runDiff(options?: RunDiffOptions): Promise<DiffResult> {
  const { examplePath = '.env.example', envPath = '.env' } = options ?? {}

  let exampleContent = ''
  try {
    exampleContent = await readFile(examplePath, 'utf8')
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
    // .env.example doesn't exist — nothing to diff against
  }

  let envContent = ''
  try {
    envContent = await readFile(envPath, 'utf8')
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
    // .env doesn't exist — all example entries will be "missing"
  }

  const entries = parseExampleFile(exampleContent)
  const envKeys = new Set(Object.keys(parseEnvFile(envContent)))
  const missing = diffEnv(entries, envKeys)

  return { missing }
}
