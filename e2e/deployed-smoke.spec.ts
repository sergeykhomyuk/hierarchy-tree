import { expect, test } from '@playwright/test';

// Runs only in the `deployed` Playwright project (playwright.config.ts),
// which exists only when DEPLOYED_BASE_URL is set - post-merge, against
// the live Cloudflare Pages hostname read from deployment.json
// (invariants 123, 124, 126a). No route mocks: this is the one spec that
// deliberately hits the real host, because it is what proves the SPA
// fallback and response headers a local `vite preview` run cannot (that
// server has its own fallback and sets no headers - VERIFICATION.md).

test('the home route renders on the live host', async ({ page }) => {
  const response = await page.goto('/');

  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    "The hierarchy view isn't built yet",
  );
});

test('/login renders with a 200 on direct load and on refresh', async ({
  page,
}) => {
  const firstLoad = await page.goto('/login');
  expect(firstLoad?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    "Sign in isn't built yet",
  );

  const reload = await page.reload();
  expect(reload?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    "Sign in isn't built yet",
  );
});

test('the live response carries frame-ancestors none', async ({ page }) => {
  const response = await page.goto('/');

  expect(response?.headers()['content-security-policy']).toBe(
    "frame-ancestors 'none'",
  );
});
