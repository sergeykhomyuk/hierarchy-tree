import path from 'node:path';
import { defineConfig } from 'vitest/config';

const alias = {
  '@app': path.resolve(import.meta.dirname, './src/app'),
  '@features': path.resolve(import.meta.dirname, './src/features'),
  '@shared': path.resolve(import.meta.dirname, './src/shared'),
  '@platform': path.resolve(import.meta.dirname, './src/platform'),
};

// The manually run live smoke project only (invariants 115, 116): a real
// network call against the real backend, so no fetch stub, no fake
// transport, and deliberately excluded from vitest.config.ts's projects
// so `npm test`/`npm run test:coverage` never collect it by accident.
export default defineConfig({
  resolve: { alias },
  test: {
    include: ['scripts/live-smoke/**/*.test.ts'],
    environment: 'node',
    testTimeout: 20_000,
  },
});
