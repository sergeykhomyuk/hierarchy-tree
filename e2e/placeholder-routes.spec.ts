import { expect, test } from '@playwright/test';
import { recordConsole } from './support/consoleRecorder';
import { installRouteMocks } from './support/routeMocks';

test.describe('placeholder routes', () => {
  test('the home route renders the hierarchy placeholder', async ({
    page,
    baseURL,
  }) => {
    await installRouteMocks(page, baseURL ?? '');
    const { records } = recordConsole(page);

    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      "The hierarchy view isn't built yet",
    );
    await expect(page).toHaveTitle('Hierarchy');
    await expect(page.getByRole('main')).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Skip to main content' }),
    ).toBeAttached();

    expect(await page.evaluate(() => document.documentElement.lang)).toBe('en');
    expect(await page.evaluate(() => document.documentElement.dir)).toBe('ltr');

    expect(records).toEqual([]);
  });

  test('the login route renders the generic auth placeholder', async ({
    page,
    baseURL,
  }) => {
    await installRouteMocks(page, baseURL ?? '');
    const { records } = recordConsole(page);

    await page.goto('/login');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      "Sign in isn't built yet",
    );
    await expect(page).toHaveTitle('Sign in');

    expect(records).toEqual([]);
  });

  test('the skip link is the first thing a keyboard user reaches', async ({
    page,
    baseURL,
  }) => {
    await installRouteMocks(page, baseURL ?? '');

    await page.goto('/');
    // The lazy route chunk resolves asynchronously - without this, Tab
    // can fire before the skip link exists and land on body instead,
    // with nothing afterward to move focus back onto it.
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // Without this, the page can hold DOM focus without OS/browser-level
    // focus, so the very first Tab lands nowhere observable.
    await page.bringToFront();
    await page.keyboard.press('Tab');

    await expect(
      page.getByRole('link', { name: 'Skip to main content' }),
    ).toBeFocused();
  });
});
