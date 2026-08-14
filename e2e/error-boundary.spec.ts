import { expect, test } from '@playwright/test';
import { recordConsole } from './support/consoleRecorder';
import { installRouteMocks } from './support/routeMocks';
import './support/telemetryWindow';

const CORRELATION_ID_PATTERN = /^[0-9a-f]{32}$/;

test('a forced route chunk failure renders the boundary with a correlation id and recovers on retry', async ({
  page,
  baseURL,
}) => {
  await installRouteMocks(page, baseURL ?? '');
  const { records } = recordConsole(page);

  let hasAbortedOnce = false;
  await page.route('**/assets/LoginRoute-*.js', async (route) => {
    if (hasAbortedOnce) {
      await route.continue();
      return;
    }
    hasAbortedOnce = true;
    await route.abort('failed');
  });

  await page.goto('/login');

  const alert = page.getByRole('alert');
  await expect(alert).toBeVisible();
  await expect(alert).toContainText('errorSurface.title');

  const correlationIdText = await alert.locator('p').last().textContent();
  expect(correlationIdText?.trim()).toMatch(CORRELATION_ID_PATTERN);

  const beforeRetry = await page.evaluate(
    () => window.__hierarchyTreeTelemetry?.read() ?? [],
  );
  const errorShown = beforeRetry.filter(
    (record) =>
      record.kind === 'analytics' && record.name === 'app.error_boundary_shown',
  );
  expect(errorShown).toHaveLength(1);
  const routeViewedBeforeRetry = beforeRetry.filter(
    (record) =>
      record.kind === 'analytics' && record.name === 'app.route_viewed',
  );
  expect(routeViewedBeforeRetry).toHaveLength(0);

  const retryButton = page.getByRole('button', { name: 'errorSurface.retry' });
  await retryButton.focus();
  await expect(retryButton).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'login.title',
  );
  await expect(alert).toBeHidden();

  // Invariant 100's one stated exception: an aborted subresource makes
  // the browser itself log a network error no application code can
  // suppress. Anything beyond that single aborted-request entry fails
  // this assertion exactly as an empty one would.
  expect(records).toHaveLength(1);
  expect(records[0]?.text).toContain('Failed to load resource');
});
