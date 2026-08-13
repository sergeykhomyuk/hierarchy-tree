import path from 'node:path'
import { defineConfig } from 'vitest/config'

// Projects and coverage thresholds arrive in milestone 1 step 3; this config
// starts as the path-alias source of truth shared with vite.config.ts.
export default defineConfig({
  resolve: {
    alias: {
      '@app': path.resolve(import.meta.dirname, './src/app'),
      '@features': path.resolve(import.meta.dirname, './src/features'),
      '@shared': path.resolve(import.meta.dirname, './src/shared'),
      '@platform': path.resolve(import.meta.dirname, './src/platform'),
    },
  },
})
