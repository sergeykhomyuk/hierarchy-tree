import { expect, test } from '@playwright/test';
import { createAxeBuilder } from './support/axeBuilder';
import { installRouteMocks } from './support/routeMocks';
import { installSignInApiMock, signIn } from './support/signIn';

const ROUTES = [{ path: '/does-not-exist', heading: 'notFound.title' }];

test.describe('accessibility', () => {
  for (const route of ROUTES) {
    test(`${route.path} has zero axe violations`, async ({ page, baseURL }) => {
      await installRouteMocks(page, baseURL ?? '');
      await page.goto(route.path);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        route.heading,
      );

      const results = await createAxeBuilder(page).analyze();
      expect(results.violations).toEqual([]);
    });
  }

  test('has no violations on /login', async ({ page, baseURL }) => {
    await installRouteMocks(page, baseURL ?? '');
    await page.goto('/login');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'login.heading',
    );

    const results = await createAxeBuilder(page).analyze();
    expect(results.violations).toEqual([]);
  });

  // / is a guarded route since M3, so reaching the hierarchy placeholder
  // (and the header above it) needs a session first. Both themes: the
  // header is in scope for invariant 111, same as the login card.
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`/ has zero axe violations, including the header, in ${colorScheme}`, async ({
      page,
      baseURL,
    }) => {
      await installRouteMocks(page, baseURL ?? '');
      await page.emulateMedia({ colorScheme });
      await installSignInApiMock(page);
      await signIn(page);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        'home.title',
      );
      await expect(
        page.getByRole('button', { name: 'header.logout' }),
      ).toBeVisible();

      const results = await createAxeBuilder(page).analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
