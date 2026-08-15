import { expect, test } from '@playwright/test';

// Runs only in the `deployed` Playwright project (playwright.config.ts),
// which exists only when DEPLOYED_BASE_URL is set - post-merge, against
// the live Cloudflare Pages hostname read from deployment.json
// (invariants 123, 124, 126a). No route mocks: this is the one spec that
// deliberately hits the real host, because it is what proves the SPA
// fallback and response headers a local `vite preview` run cannot (that
// server has its own fallback and sets no headers - VERIFICATION.md).

test('an anonymous visit to the home route redirects to the sign-in card on the live host', async ({
  page,
}) => {
  // / is a guarded route since M3 - the initial document response is
  // still a plain 200 (the SPA fallback this spec exists to prove), and
  // the redirect to /login happens client-side after hydration.
  const response = await page.goto('/');

  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Please login',
  );
});

test('/login renders with a 200 on direct load and on refresh', async ({
  page,
}) => {
  const firstLoad = await page.goto('/login');
  expect(firstLoad?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Please login',
  );

  const reload = await page.reload();
  expect(reload?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Please login',
  );
});

test('the live response carries frame-ancestors none', async ({ page }) => {
  const response = await page.goto('/');

  expect(response?.headers()['content-security-policy']).toBe(
    "frame-ancestors 'none'",
  );
});
