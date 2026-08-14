import { expect, test } from '@playwright/test';
import { createAxeBuilder } from './support/axeBuilder';
import { installRouteMocks } from './support/routeMocks';

const ROUTES = [
  { path: '/', heading: "The hierarchy view isn't built yet" },
  { path: '/login', heading: "Sign in isn't built yet" },
  { path: '/does-not-exist', heading: 'Page not found' },
];

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
});
