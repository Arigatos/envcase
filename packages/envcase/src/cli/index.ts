// TODO: implement CLI entry point

/**
 * CLI entry point for the `envcase` command.
 * Dispatches to generate, check, and diff subcommands.
 *
 * Usage:
 *   npx envcase generate
 *   npx envcase check
 *   npx envcase diff
 */
const [, , command] = process.argv

switch (command) {
  case 'generate':
    // TODO: import and run generate command
    console.error('envcase generate: not yet implemented')
    process.exit(1)
    break
  case 'check':
    // TODO: import and run check command
    console.error('envcase check: not yet implemented')
    process.exit(1)
    break
  case 'diff':
    // TODO: import and run diff command
    console.error('envcase diff: not yet implemented')
    process.exit(1)
    break
  default:
    console.error(`[envcase] Unknown command: ${command ?? '(none)'}`)
    console.error('Usage: envcase <generate|check|diff>')
    process.exit(1)
}
