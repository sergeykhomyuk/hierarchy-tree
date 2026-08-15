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
  // needs a session first.
  test('/ has zero axe violations', async ({ page, baseURL }) => {
    await installRouteMocks(page, baseURL ?? '');
    await installSignInApiMock(page);
    await signIn(page);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'home.title',
    );

    const results = await createAxeBuilder(page).analyze();
    expect(results.violations).toEqual([]);
  });
});
