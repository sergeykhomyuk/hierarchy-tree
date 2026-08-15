import { expect, test } from '@playwright/test';
import { installRouteMocks } from './support/routeMocks';
import { installSignInApiMock, signIn } from './support/signIn';
import './support/telemetryWindow';

test('the buffer sink records exactly one route_viewed for the initial load and no redacted-key leakage', async ({
  page,
  baseURL,
}) => {
  await installRouteMocks(page, baseURL ?? '');

  // / is a guarded route since M3 - an unauthenticated visit redirects to
  // /login before the router ever returns to idle (invariant 127), so
  // this is still exactly one settled navigation, just to a different
  // destination than before the guard existed.
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'login.heading',
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

test('local and session storage are empty before sign-in, and session storage holds exactly one entry after', async ({
  page,
  baseURL,
}) => {
  await installRouteMocks(page, baseURL ?? '');
  await installSignInApiMock(page);

  await page.goto('/login');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'login.heading',
  );

  const beforeSignIn = await page.evaluate(() => ({
    localStorageLength: window.localStorage.length,
    sessionStorageLength: window.sessionStorage.length,
  }));
  expect(beforeSignIn.localStorageLength).toBe(0);
  expect(beforeSignIn.sessionStorageLength).toBe(0);

  await signIn(page);

  const afterSignIn = await page.evaluate(() => ({
    localStorageLength: window.localStorage.length,
    sessionStorageLength: window.sessionStorage.length,
  }));
  expect(afterSignIn.localStorageLength).toBe(0);
  expect(afterSignIn.sessionStorageLength).toBe(1);
});
