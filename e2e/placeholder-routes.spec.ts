import { expect, test } from '@playwright/test';
import { recordConsole } from './support/consoleRecorder';
import { installRouteMocks } from './support/routeMocks';
import { installSignInApiMock, signIn } from './support/signIn';

test.describe('placeholder routes', () => {
  test('the home route renders through the real router once signed in', async ({
    page,
    baseURL,
  }) => {
    // / is a guarded route since M3 - reaching it means signing in
    // first, which is what this test is actually exercising, alongside
    // the route itself. installSignInApiMock's one user record satisfies
    // auth's own schema but not the hierarchy feature's (no email, a
    // string id) - dedicated hierarchy-state coverage lives in
    // HomeRoute.test.tsx and the M3 boundary's own e2e suite, so this is
    // deliberately just the error state landing correctly rather than a
    // claim about which of the four states renders.
    await installRouteMocks(page, baseURL ?? '');
    await installSignInApiMock(page);
    const { records } = recordConsole(page);

    await signIn(page);

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'page.errorHeading',
    );
    await expect(page).toHaveTitle('page.documentTitle');
    await expect(page.getByRole('main')).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'layout.skipLink' }),
    ).toBeAttached();

    expect(await page.evaluate(() => document.documentElement.lang)).toBe(
      'zxx',
    );
    expect(await page.evaluate(() => document.documentElement.dir)).toBe('ltr');

    expect(records).toEqual([]);
  });

  test('the login route renders the sign-in card', async ({
    page,
    baseURL,
  }) => {
    await installRouteMocks(page, baseURL ?? '');
    const { records } = recordConsole(page);

    await page.goto('/login');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'login.heading',
    );
    await expect(page).toHaveTitle('login.documentTitle');
    await expect(page.getByLabel('login.emailLabel')).toBeVisible();
    await expect(page.getByLabel('login.passwordLabel')).toBeVisible();

    expect(records).toEqual([]);
  });

  test('the skip link is the first thing a keyboard user reaches', async ({
    page,
    baseURL,
  }) => {
    await installRouteMocks(page, baseURL ?? '');

    // /login rather than the now-guarded / - the skip link lives on the
    // shared ApplicationLayout every route renders inside, so an
    // unguarded route proves the same thing without needing a session.
    await page.goto('/login');
    // The lazy route chunk resolves asynchronously - without this, Tab
    // can fire before the skip link exists and land on body instead,
    // with nothing afterward to move focus back onto it.
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // Without this, the page can hold DOM focus without OS/browser-level
    // focus, so the very first Tab lands nowhere observable.
    await page.bringToFront();
    await page.keyboard.press('Tab');

    await expect(
      page.getByRole('link', { name: 'layout.skipLink' }),
    ).toBeFocused();
  });
});
