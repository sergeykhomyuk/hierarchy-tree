import { expect, test } from '@playwright/test';
import { installRouteMocks } from './support/routeMocks';
import './support/telemetryWindow';

test('the buffer sink records exactly one route_viewed for the initial load and no redacted-key leakage', async ({
  page,
  baseURL,
}) => {
  await installRouteMocks(page, baseURL ?? '');

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'home.title',
  );

  const records = await page.evaluate(
    () => window.__hierarchyTreeTelemetry?.read() ?? [],
  );

  const routeViewed = records.filter(
    (record) =>
      record.kind === 'analytics' && record.name === 'app.route_viewed',
  );
  expect(routeViewed).toHaveLength(1);

  expect(JSON.stringify(records)).not.toMatch(/password|secret|token/i);
});

test('local and session storage are empty after visiting both routes', async ({
  page,
  baseURL,
}) => {
  await installRouteMocks(page, baseURL ?? '');

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'home.title',
  );
  await page.goto('/login');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'login.heading',
  );

  const storageLengths = await page.evaluate(() => ({
    localStorageLength: window.localStorage.length,
    sessionStorageLength: window.sessionStorage.length,
  }));

  expect(storageLengths.localStorageLength).toBe(0);
  expect(storageLengths.sessionStorageLength).toBe(0);
});
