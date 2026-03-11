/**
 * CLI entry point for the `envcase` command.
 * Dispatches to generate, check, and diff subcommands.
 *
 * Usage:
 *   npx envcase generate [--schema <path>] [--output <path>]
 *   npx envcase check
 *   npx envcase diff
 */

import { runGenerate } from './generate.js'
import { runCheck, formatCheckResult } from './check.js'
import { runDiff, formatDiffResult } from './diff.js'

const [, , command, ...args] = process.argv

function parseArgs(argv: string[]): Record<string, string> {
  const result: Record<string, string> = {}
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg.startsWith('--') && i + 1 < argv.length) {
      result[arg.slice(2)] = argv[++i]
    }
  }
  return result
}

async function main(): Promise<void> {
  switch (command) {
    case 'generate': {
      const flags = parseArgs(args)
      const schemaPath = flags['schema'] ?? 'src/env.ts'
      const outputPath = flags['output'] ?? '.env.example'

      // Dynamically import the user's schema file and look for a `schema` export
      let mod: Record<string, unknown>
      try {
        mod = (await import(/* @vite-ignore */ `${process.cwd()}/${schemaPath}`)) as Record<
          string,
          unknown
        >
      } catch (err) {
        console.error(
          `[envcase] Could not import schema file: ${schemaPath}\n` +
            `  Make sure the file exists and exports a "schema" object.\n` +
            `  Example: export const schema = { PORT: z.coerce.number() }`
        )
        process.exit(1)
      }

      const schema = mod['schema'] as Record<string, import('zod').ZodTypeAny> | undefined
      if (schema == null || typeof schema !== 'object') {
        console.error(
          `[envcase] No "schema" export found in ${schemaPath}.\n` +
            `  Export your raw Zod schema object:\n` +
            `  export const schema = { PORT: z.coerce.number(), ... }\n` +
            `  export const env = defineEnv(schema)`
        )
        process.exit(1)
      }

      await runGenerate({ schema, outputPath })
      break
    }

    case 'check': {
      const flags = parseArgs(args)
      const schemaPath = flags['schema'] ?? 'src/env.ts'
      const envPath = flags['env'] ?? '.env'

      let mod: Record<string, unknown>
      try {
        mod = (await import(/* @vite-ignore */ `${process.cwd()}/${schemaPath}`)) as Record<
          string,
          unknown
        >
      } catch {
        console.error(
          `[envcase] Could not import schema file: ${schemaPath}\n` +
            `  Make sure the file exists and exports a "schema" object.`
        )
        process.exit(1)
      }

      const schema = mod['schema'] as Record<string, import('zod').ZodTypeAny> | undefined
      if (schema == null || typeof schema !== 'object') {
        console.error(
          `[envcase] No "schema" export found in ${schemaPath}.\n` +
            `  Export your raw Zod schema object:\n` +
            `  export const schema = { PORT: z.coerce.number(), ... }`
        )
        process.exit(1)
      }

      const result = await runCheck({ schema, envPath })
      console.log(formatCheckResult(result))
      if (!result.valid) process.exit(1)
      break
    }

    case 'diff': {
      const flags = parseArgs(args)
      const examplePath = flags['example'] ?? '.env.example'
      const envPath = flags['env'] ?? '.env'
      const result = await runDiff({ examplePath, envPath })
      console.log(formatDiffResult(result))
      if (result.missing.length > 0) process.exit(1)
      break
    }

    default:
      console.error(`[envcase] Unknown command: ${command ?? '(none)'}`)
      console.error('Usage: envcase <generate|check|diff>')
      process.exit(1)
  }
}

main().catch((err) => {
  console.error('[envcase] Unexpected error:', err)
  process.exit(1)
})
