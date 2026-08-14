import { expect, test } from '@playwright/test';
import { recordConsole } from './support/consoleRecorder';
import { installRouteMocks } from './support/routeMocks';

test('an unknown path renders the not-found route with a working link home', async ({
  page,
  baseURL,
}) => {
  await installRouteMocks(page, baseURL ?? '');
  const { records } = recordConsole(page);

  await page.goto('/this-path-does-not-exist');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'notFound.title',
  );

  const homeLink = page.getByRole('link', { name: 'notFound.linkHome' });
  await expect(homeLink).toBeVisible();
  await homeLink.click();

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'home.title',
  );
  expect(records).toEqual([]);
});
