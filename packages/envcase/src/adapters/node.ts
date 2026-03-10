/**
 * Adapter that reads environment variables from `process.env`.
 * This is the default adapter for Node.js runtimes.
 */
export function nodeAdapter(): Record<string, string | undefined> {
  return process.env as Record<string, string | undefined>
}
