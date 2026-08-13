import { expect, test } from '@playwright/test';
import { createAxeBuilder } from './support/axeBuilder';
import { recordConsole } from './support/consoleRecorder';
import { forceDirection } from './support/forceDirection';
import { installRouteMocks } from './support/routeMocks';

// English is the only shipped locale in this phase (invariant 65), so
// there is no product path that switches direction - forceDirection.ts
// overrides the browser-rendered `dir` directly to prove invariant 68's
// claim (logical properties mirror correctly with no other code change)
// independently of locale-driven derivation, which invariant 66 covers
// separately at the unit level and in placeholder-routes/accessibility.
test('the placeholder pages mirror correctly under a forced right-to-left direction', async ({
  page,
  baseURL,
}) => {
  await installRouteMocks(page, baseURL ?? '');
  const { records } = recordConsole(page);

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    "The hierarchy view isn't built yet",
  );

  await forceDirection(page, 'rtl');
  expect(await page.evaluate(() => document.documentElement.dir)).toBe('rtl');

  const overflowsHorizontally = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(overflowsHorizontally).toBe(false);

  const results = await createAxeBuilder(page).analyze();
  expect(results.violations).toEqual([]);
  expect(records).toEqual([]);
});
