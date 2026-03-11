import { defineConfig } from 'tsup'

export default defineConfig([
  // Core library — both ESM and CJS
  {
    entry: {
      index: 'src/index.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    sourcemap: true,
    outDir: 'dist',
    esbuildOptions(options, context) {
      if (context.format === 'cjs') {
        options.define = { ...options.define, 'import.meta.env': 'undefined' }
      }
    },
  },
  // Adapters — ESM only (Vite adapter uses import.meta)
  {
    entry: {
      'adapters/index': 'src/adapters/index.ts',
    },
    format: ['esm'],
    dts: true,
    sourcemap: true,
    outDir: 'dist',
  },
  // CLI — ESM only, executable
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