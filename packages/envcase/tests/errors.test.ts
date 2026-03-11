import { describe, it, expect } from 'vitest'
import { EnvCaseError } from '../src/errors.js'
import type { FieldError } from '../src/errors.js'

// ── helpers ────────────────────────────────────────────────────────────────

function missingField(key: string, envHint?: string): FieldError {
  return { key, message: 'Required but missing', kind: 'missing', envHint }
}

function invalidField(key: string, message: string): FieldError {
  return { key, message, kind: 'invalid' }
}

// ── identity ───────────────────────────────────────────────────────────────

describe('EnvCaseError identity', () => {
  it('is an instance of Error', () => {
    expect(new EnvCaseError([missingField('X')])).toBeInstanceOf(Error)
  })

  it('is an instance of EnvCaseError', () => {
    expect(new EnvCaseError([missingField('X')])).toBeInstanceOf(EnvCaseError)
  })

  it('has name "EnvCaseError"', () => {
    expect(new EnvCaseError([missingField('X')]).name).toBe('EnvCaseError')
  })

  it('exposes the fields array unchanged', () => {
    const fields: FieldError[] = [missingField('A'), invalidField('B', 'bad')]
    expect(new EnvCaseError(fields).fields).toEqual(fields)
  })
})

// ── exact line format ──────────────────────────────────────────────────────
//
// These tests pin the character-exact format shown in CLAUDE.md.
// They are intentionally strict — any whitespace or padding change breaks them.

describe('EnvCaseError — exact line format', () => {
  it('header is exactly "[envcase] Environment validation failed:"', () => {
    const lines = new EnvCaseError([missingField('X')]).message.split('\n')
    expect(lines[0]).toBe('[envcase] Environment validation failed:')
  })

  it('blank line separates header from field list', () => {
    const lines = new EnvCaseError([missingField('X')]).message.split('\n')
    expect(lines[1]).toBe('')
  })

  it('field line: 2-space indent, ❌, space, key padded to 14 chars, " → ", message', () => {
    // DATABASE_URL is 12 chars → padEnd(14) adds 2 spaces → 3 spaces before →
    const lines = new EnvCaseError([missingField('DATABASE_URL')]).message.split('\n')
    expect(lines[2]).toBe('  ❌ DATABASE_URL   → Required but missing')
  })

  it('field line: short key (PORT = 4 chars) pads to 14 chars → 11 spaces before →', () => {
    const lines = new EnvCaseError([
      invalidField('PORT', 'Expected number, got "not-a-number"'),
    ]).message.split('\n')
    expect(lines[2]).toBe('  ❌ PORT           → Expected number, got "not-a-number"')
  })

  it('field line: 8-char key (NODE_ENV) pads to 14 chars → 7 spaces before →', () => {
    const lines = new EnvCaseError([
      invalidField('NODE_ENV', 'Expected "development" | "staging" | "production", got "prod"'),
    ]).message.split('\n')
    expect(lines[2]).toBe(
      '  ❌ NODE_ENV       → Expected "development" | "staging" | "production", got "prod"'
    )
  })

  it('multiple field lines are consecutive with no blank lines between them', () => {
    const lines = new EnvCaseError([
      missingField('DATABASE_URL'),
      missingField('NODE_ENV', 'development|staging|production'),
    ]).message.split('\n')
    expect(lines[2]).toBe('  ❌ DATABASE_URL   → Required but missing')
    expect(lines[3]).toBe('  ❌ NODE_ENV       → Required but missing')
  })
})

// ── missing-variable format (full spec example) ────────────────────────────

describe('EnvCaseError — missing variable format', () => {
  // Exact output from CLAUDE.md "Missing variable" section
  const SPEC_OUTPUT = [
    '[envcase] Environment validation failed:',
    '',
    '  ❌ DATABASE_URL   → Required but missing',
    '  ❌ NODE_ENV       → Required but missing',
    '',
    '  💡 Add these to your .env file:',
    '',
    '     DATABASE_URL=',
    '     NODE_ENV=development|staging|production',
    '',
    '  Run `npx envcase generate` to auto-create a .env.example',
  ].join('\n')

  it('matches the spec output exactly', () => {
    const err = new EnvCaseError([
      missingField('DATABASE_URL'),
      missingField('NODE_ENV', 'development|staging|production'),
    ])
    expect(err.message).toBe(SPEC_OUTPUT)
  })

  it('hint header is "  💡 Add these to your .env file:"', () => {
    const lines = new EnvCaseError([missingField('X')]).message.split('\n')
    const hintLine = lines.find((l) => l.includes('💡'))
    expect(hintLine).toBe('  💡 Add these to your .env file:')
  })

  it('blank line appears between hint header and .env entries', () => {
    const lines = new EnvCaseError([missingField('KEY')]).message.split('\n')
    const hintIdx = lines.findIndex((l) => l.includes('💡'))
    expect(lines[hintIdx + 1]).toBe('')
  })

  it('.env entry has 5-space indent: "     KEY="', () => {
    const lines = new EnvCaseError([missingField('MY_VAR')]).message.split('\n')
    const entry = lines.find((l) => l.includes('MY_VAR='))
    expect(entry).toBe('     MY_VAR=')
  })

  it('.env entry appends envHint: "     NODE_ENV=development|staging|production"', () => {
    const lines = new EnvCaseError([
      missingField('NODE_ENV', 'development|staging|production'),
    ]).message.split('\n')
    const entry = lines.find((l) => l.includes('NODE_ENV='))
    expect(entry).toBe('     NODE_ENV=development|staging|production')
  })

  it('blank line appears between .env entries and Run tip', () => {
    const lines = new EnvCaseError([missingField('X')]).message.split('\n')
    const runIdx = lines.findIndex((l) => l.includes('npx envcase generate'))
    expect(lines[runIdx - 1]).toBe('')
  })

  it('"Run" line is exactly "  Run `npx envcase generate` to auto-create a .env.example"', () => {
    const lines = new EnvCaseError([missingField('X')]).message.split('\n')
    const runLine = lines.find((l) => l.includes('npx envcase generate'))
    expect(runLine).toBe('  Run `npx envcase generate` to auto-create a .env.example')
  })

  it('does NOT contain "Check your .env file" when all errors are missing', () => {
    const err = new EnvCaseError([missingField('X'), missingField('Y')])
    expect(err.message).not.toContain('Check your .env file')
  })
})

// ── wrong-type format (full spec example) ─────────────────────────────────

describe('EnvCaseError — wrong-type format', () => {
  // Exact output from CLAUDE.md "Wrong type" section
  const SPEC_OUTPUT = [
    '[envcase] Environment validation failed:',
    '',
    '  ❌ PORT           → Expected number, got "not-a-number"',
    '  ❌ NODE_ENV       → Expected "development" | "staging" | "production", got "prod"',
    '',
    '  💡 Check your .env file and fix the values above.',
  ].join('\n')

  it('matches the spec output exactly', () => {
    const err = new EnvCaseError([
      invalidField('PORT', 'Expected number, got "not-a-number"'),
      invalidField(
        'NODE_ENV',
        'Expected "development" | "staging" | "production", got "prod"'
      ),
    ])
    expect(err.message).toBe(SPEC_OUTPUT)
  })

  it('hint line is exactly "  💡 Check your .env file and fix the values above."', () => {
    const lines = new EnvCaseError([invalidField('PORT', 'bad')]).message.split('\n')
    const hintLine = lines.find((l) => l.includes('💡'))
    expect(hintLine).toBe('  💡 Check your .env file and fix the values above.')
  })

  it('blank line appears between field list and hint', () => {
    const lines = new EnvCaseError([invalidField('PORT', 'bad')]).message.split('\n')
    const hintIdx = lines.findIndex((l) => l.includes('💡'))
    expect(lines[hintIdx - 1]).toBe('')
  })

  it('does NOT contain "Add these to your .env file:" when all errors are invalid', () => {
    expect(new EnvCaseError([invalidField('PORT', 'bad')]).message).not.toContain(
      'Add these to your .env file:'
    )
  })

  it('does NOT contain "npx envcase generate" when all errors are invalid', () => {
    expect(new EnvCaseError([invalidField('PORT', 'bad')]).message).not.toContain(
      'npx envcase generate'
    )
  })
})

// ── mixed missing + invalid ────────────────────────────────────────────────

describe('EnvCaseError — mixed missing + invalid', () => {
  it('shows both hint sections', () => {
    const err = new EnvCaseError([
      missingField('DATABASE_URL'),
      invalidField('PORT', 'Expected number, got "abc"'),
    ])
    expect(err.message).toContain('Add these to your .env file:')
    expect(err.message).toContain('Check your .env file and fix the values above.')
  })

  it('only missing fields appear in the .env entry block', () => {
    const err = new EnvCaseError([
      missingField('DATABASE_URL'),
      invalidField('PORT', 'Expected number, got "abc"'),
    ])
    expect(err.message).toContain('DATABASE_URL=')
    // PORT is invalid (not missing) — must not appear as a blank KEY= entry
    const lines = err.message.split('\n')
    expect(lines.find((l) => /^\s+PORT=\s*$/.test(l))).toBeUndefined()
  })
})
