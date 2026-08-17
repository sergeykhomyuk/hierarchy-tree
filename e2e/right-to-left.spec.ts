import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { createAxeBuilder } from './support/axeBuilder';
import { recordConsole } from './support/consoleRecorder';
import { forceDirection } from './support/forceDirection';
import { installRouteMocks } from './support/routeMocks';
import { installSignInApiMock, signIn } from './support/signIn';

// English is the only shipped PRODUCT locale (invariant 65) - a
// non-product-facing `test` locale (Locale.Test, tag 'zxx') exists for
// unit/e2e assertions only (see ARCHITECTURE.md's decision log), reachable
// solely through this Playwright project's `locale: 'zxx'` context option,
// never through any in-app control. There is still no PRODUCT path that
// switches direction - forceDirection.ts overrides the browser-rendered
// `dir` directly to prove invariant 68's claim (logical properties mirror
// correctly with no other code change) independently of locale-driven
// derivation, which invariant 66 covers separately at the unit level and
// in placeholder-routes/accessibility. This spec's headings assert the
// key-echoed catalogue strings the `zxx` locale produces, same as every
// other spec under this project - unrelated to the RTL mechanism itself.
//
// TECH.md's plan for this invariant also names a "mirrored inline-start
// indicator" assertion (an element whose computed padding-inline-start
// resolves on the right-hand side). No component this phase ships has
// asymmetric inline padding or margin to measure - Card's padding is
// uniform (p-3/p-6) and nothing else has directional spacing (confirmed
// by grep: no ps-/pe-/ms-/me- Tailwind utility appears anywhere in
// src/). That assertion has no real subject until a later phase ships
// one; asserting it against invariant 67's own lint script
// (assert-no-physical-properties.mjs, which independently proves no
// physical-direction utility was used at all) is the closest honest
// substitute available now. What this spec DOES assert instead: the
// `dir` attribute actually cascades into computed CSS `direction`
// (invariant 68's structural precondition - every logical property
// resolves relative to it), across every route this phase ships.
// / is a guarded route since M3 - reaching it under test needs a session
// first, unlike /login which stays a plain unauthenticated visit.
const ROUTES = [
  {
    path: '/',
    // installSignInApiMock's one user record satisfies auth's own schema
    // but not the hierarchy feature's (no email, a string id), so this
    // lands on the error state - see placeholder-routes.spec.ts's own
    // note on the same mock.
    heading: 'page.errorHeading',
    visit: async (page: Page) => {
      await installSignInApiMock(page);
      await signIn(page);
    },
  },
  {
    path: '/login',
    heading: 'login.heading',
    visit: async (page: Page) => {
      await page.goto('/login');
    },
  },
];

test.describe('right-to-left', () => {
  for (const route of ROUTES) {
    test(`${route.path} mirrors correctly under a forced right-to-left direction`, async ({
      page,
      baseURL,
    }) => {
      await installRouteMocks(page, baseURL ?? '');
      const { records } = recordConsole(page);

      await route.visit(page);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        route.heading,
      );

      await forceDirection(page, 'rtl');
      expect(await page.evaluate(() => document.documentElement.dir)).toBe(
        'rtl',
      );
      expect(
        await page.evaluate(
          () => getComputedStyle(document.documentElement).direction,
        ),
      ).toBe('rtl');

      const overflowsHorizontally = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      );
      expect(overflowsHorizontally).toBe(false);

      const results = await createAxeBuilder(page).analyze();
      expect(results.violations).toEqual([]);
      expect(records).toEqual([]);

      await page.screenshot({
        path: `test-results/right-to-left-${route.path.replace('/', 'home')}.png`,
      });
    });
  }
});
