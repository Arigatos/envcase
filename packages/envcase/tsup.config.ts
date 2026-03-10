import { defineConfig } from 'tsup'

export default defineConfig([
  // Main library entry
  {
    entry: {
      index: 'src/index.ts',
      'adapters/index': 'src/adapters/index.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    sourcemap: true,
    outDir: 'dist',
  },
  // CLI entry (ESM only, executable)
  {
    entry: {
      'cli/index': 'src/cli/index.ts',
    },
    format: ['esm'],
    dts: false,
    sourcemap: true,
    outDir: 'dist',
    banner: {
      js: '#!/usr/bin/env node',
    },
  },
])
