import { expect, test } from '@playwright/test';
import { recordConsole } from './support/consoleRecorder';
import { installRouteMocks } from './support/routeMocks';

// Invariant 100 covers the development server as well as the production
// build - this project runs against `npm run dev` (playwright.config.ts),
// where Vite's own CSP mode is the permissive development policy.
test.describe('development server console hygiene', () => {
  for (const path of ['/', '/login']) {
    test(`${path} produces no console error or warning`, async ({
      page,
      baseURL,
    }) => {
      await installRouteMocks(page, baseURL ?? '');
      const { records } = recordConsole(page);

      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

      expect(records).toEqual([]);
    });
  }
});
