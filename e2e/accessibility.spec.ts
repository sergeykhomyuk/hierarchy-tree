import { expect, test } from '@playwright/test';
import { createAxeBuilder } from './support/axeBuilder';
import {
  installDeferredUserMock,
  submitSignInForm,
} from './support/deferredUserMock';
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
      // installSignInApiMock's one user record satisfies auth's own
      // schema but not the hierarchy feature's (no email, a string id),
      // so this lands on the error state - see placeholder-routes.spec.ts's
      // own note on the same mock.
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        'page.errorHeading',
      );
      await expect(
        page.getByRole('button', { name: 'header.logout' }),
      ).toBeVisible();

      const results = await createAxeBuilder(page).analyze();
      expect(results.violations).toEqual([]);
    });
  }

  // The header's other two presentations (invariant 99) - the pending
  // aria-busy skeleton and the neutral signedInFallback shown when a
  // name never arrives - are not axe-checked by the resolved-only test
  // above and get their own coverage here, in both themes.
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`/ has zero axe violations while the header's name is still resolving, in ${colorScheme}`, async ({
      page,
      baseURL,
    }) => {
      await installRouteMocks(page, baseURL ?? '');
      await page.emulateMedia({ colorScheme });
      await installDeferredUserMock(page);

      await submitSignInForm(page);
      await expect(page.getByLabel('header.nameLoading')).toBeVisible();

      const results = await createAxeBuilder(page).analyze();
      expect(results.violations).toEqual([]);
    });

    test(`/ has zero axe violations when the header's name cannot resolve, in ${colorScheme}`, async ({
      page,
      baseURL,
    }) => {
      await installRouteMocks(page, baseURL ?? '');
      await page.emulateMedia({ colorScheme });
      const getResolveUser = await installDeferredUserMock(page);

      await submitSignInForm(page);
      getResolveUser()({ status: 200, body: [] });
      await expect(page.getByText('header.signedInFallback')).toBeVisible();

      const results = await createAxeBuilder(page).analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
