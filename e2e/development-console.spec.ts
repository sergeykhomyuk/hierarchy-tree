import { expect, test } from '@playwright/test';
import { recordConsole } from './support/consoleRecorder';
import { installPopulatedHierarchyMock } from './support/hierarchyFixture';
import { installRouteMocks } from './support/routeMocks';
import { signIn } from './support/signIn';

// Invariant 100 covers the development server as well as the production
// build - this project runs against `npm run dev` (playwright.config.ts),
// where Vite's own CSP mode is the permissive development policy.
test.describe('development server console hygiene', () => {
  test('/login produces no console error or warning', async ({
    page,
    baseURL,
  }) => {
    await installRouteMocks(page, baseURL ?? '');
    const { records } = recordConsole(page);

    await page.goto('/login');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    expect(records).toEqual([]);
  });

  // / is a guarded route since M3 - reaching the hierarchy placeholder
  // needs a session first. installSignInApiMock's own /users.json record
  // (a bare id/firstName/lastName shape) satisfies the header's
  // signedInUserSchema but not the stricter personSchema the hierarchy
  // loader validates the same resource against - a numeric id and an
  // email are both required there - so it reads as a fully invalid
  // payload and (correctly, per invariant 53) logs a rows-dropped
  // warning. A real hierarchy payload avoids that false positive.
  test('/ produces no console error or warning, signed in', async ({
    page,
    baseURL,
  }) => {
    await installRouteMocks(page, baseURL ?? '');
    await installPopulatedHierarchyMock(page);
    const { records } = recordConsole(page);

    await signIn(page);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    expect(records).toEqual([]);
  });
});
