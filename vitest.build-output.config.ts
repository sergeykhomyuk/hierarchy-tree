import { defineConfig } from 'vitest/config';

// The verify:build project only (7.1): assertions that read the built
// dist/, run after the build only. Kept out of the default vitest.config.ts
// projects so it never runs before dist/ exists.
export default defineConfig({
  test: {
    include: ['build-output/**/*.test.ts'],
    environment: 'node',
  },
});
