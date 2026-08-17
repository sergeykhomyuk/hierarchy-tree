import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { deriveSecret } from '../../src/features/auth/domain/deriveSecret';
import { installApiMocks } from './apiMocks';

export const SIGN_IN_EMAIL = 'e2e-user@example.com';
export const SIGN_IN_PASSWORD = 'e2e-password-123';
export const SIGN_IN_USER_ID = 'e2e-user-1';

const MATCHING_SECRET = deriveSecret(SIGN_IN_EMAIL, SIGN_IN_PASSWORD);

// Registers the route mocks every migrated spec needs to get past the
// guard AND land cleanly on an authenticated route: a matching secret,
// plus a schema-shaped user record for the authenticated layout's own
// loader (M3) to resolve - without one, its fetch to the users path 404s
// the schema parse and logs a warning, which the console-hygiene specs
// correctly treat as noise. Call before navigating anywhere.
export async function installSignInApiMock(page: Page): Promise<void> {
  await installApiMocks(page, {
    secret: (secret) => ({
      status: 200,
      body: secret === MATCHING_SECRET ? SIGN_IN_USER_ID : null,
    }),
    user: () => ({
      status: 200,
      body: [{ id: SIGN_IN_USER_ID, firstName: 'Ada', lastName: 'Lovelace' }],
    }),
  });
}

// Signs in from a bare /login (no `from`), which resolveDestination sends
// to `/` - the shared path every migrated spec that just needs a session
// to get past the guard uses. guard.spec.ts's own bookmarked-redirect
// flows drive the form directly instead, since they assert on the
// specific destination the guard itself chose.
//
// Selects the fields and the submit control by their stable `name`/`type`
// attributes rather than by label or role text - the `development`
// Playwright project runs with no locale override (playwright.config.ts),
// so it renders real English prose rather than the `chromium` project's
// key-echoed zxx locale, and this helper is shared by specs under both.
export async function signIn(page: Page): Promise<void> {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(SIGN_IN_EMAIL);
  await page.locator('input[name="password"]').fill(SIGN_IN_PASSWORD);
  await page.locator('form button[type="submit"]').click();
  // Locale-independent: confirms the navigation actually left /login
  // (rather than staying on it in the noMatch/serviceProblem state)
  // without depending on which locale project rendered the heading.
  await page.waitForURL((url) => !url.pathname.includes('login'));
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}
