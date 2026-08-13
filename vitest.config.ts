import path from 'node:path';
import { defineConfig } from 'vitest/config';

const alias = {
  '@app': path.resolve(import.meta.dirname, './src/app'),
  '@features': path.resolve(import.meta.dirname, './src/features'),
  '@shared': path.resolve(import.meta.dirname, './src/shared'),
  '@platform': path.resolve(import.meta.dirname, './src/platform'),
};

export default defineConfig({
  resolve: { alias },
  test: {
    passWithNoTests: false,
    projects: [
      {
        extends: true,
        test: {
          name: 'platform',
          environment: 'node',
          include: ['src/platform/**/*.test.ts', 'src/shared/theme/*.test.ts'],
          setupFiles: ['./vitest.setup.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'ui',
          environment: 'jsdom',
          include: ['src/{app,features,shared}/**/*.test.{ts,tsx}'],
          setupFiles: ['./vitest.setup.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'tooling',
          environment: 'node',
          // One path segment only, so this cannot match scripts/live-smoke/** -
          // that suite stays outside every default project (invariants 115, 116).
          include: ['scripts/*.test.ts'],
          setupFiles: ['./vitest.setup.ts'],
          // Several of this project's own tests shell out to a fresh
          // `npx eslint` per assertion (the demonstrable negatives, the
          // kit literal-string guard) - type-aware linting's per-process
          // startup cost already exceeds the 5s default here and will
          // only grow as more files enter type-aware scope.
          testTimeout: 20_000,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.*',
        'src/**/testing/**',
        'src/app/main.tsx',
        'src/**/locales/**',
        'src/vite-env.d.ts',
      ],
      reporter: ['text', 'html', 'json'],
      thresholds: {
        lines: 85,
        branches: 85,
        functions: 85,
        'src/features/*/domain/**': {
          lines: 100,
          branches: 100,
          functions: 100,
          statements: 100,
        },
      },
    },
  },
});
