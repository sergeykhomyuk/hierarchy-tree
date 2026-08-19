import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { deriveSecret } from '../src/features/auth/domain/deriveSecret';
import { installApiMocks } from './support/apiMocks';
import {
  installMutationObserver,
  readMutationLog,
} from './support/mutationLog';
import { installRouteMocks } from './support/routeMocks';
import {
  SIGN_IN_EMAIL,
  SIGN_IN_PASSWORD,
  SIGN_IN_USER_ID,
  installSignInApiMock,
  signIn,
} from './support/signIn';

const MATCHING_SECRET = deriveSecret(SIGN_IN_EMAIL, SIGN_IN_PASSWORD);

async function submitSignInForm(page: Page): Promise<void> {
  await page.locator('input[name="email"]').fill(SIGN_IN_EMAIL);
  await page.locator('input[name="password"]').fill(SIGN_IN_PASSWORD);
  await page.locator('form button[type="submit"]').click();
}

test.describe('the route guard', () => {
  test('sends a bookmarked authenticated URL to the login card with no users request and no flash', async ({
    page,
    baseURL,
  }) => {
    await installRouteMocks(page, baseURL ?? '');
    let userRequestCount = 0;
    await installApiMocks(page, {
      secret: (secret) => ({
        status: 200,
        body: secret === MATCHING_SECRET ? SIGN_IN_USER_ID : null,
      }),
      user: () => {
        userRequestCount += 1;
        return { status: 200, body: [] };
      },
    });
    await installMutationObserver(page);

    await page.goto('/');

    await expect(page).toHaveURL(/\/login\?from=%2F$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'login.heading',
    );

    expect(userRequestCount).toBe(0);
    const mutationLog = await readMutationLog(page);
    // 'page.' rather than a single stale marker string: every hierarchy
    // catalogue key lives under that one top-level namespace (no other
    // feature's catalogue does), so this catches a flash of any of the
    // page's four states rather than just one.
    expect(mutationLog.some((text) => text.includes('page.'))).toBe(false);
  });

  test('lands on the bookmarked path after signing in from the redirect', async ({
    page,
    baseURL,
  }) => {
    await installRouteMocks(page, baseURL ?? '');
    await installSignInApiMock(page);

    // A search string on the bookmark, not the bare `/` - the only
    // guarded route in this phase - so a correct round trip is
    // distinguishable from the login flow's own no-`from` default,
    // which also lands on `/`.
    await page.goto('/?a=1');
    await expect(page).toHaveURL(/\/login\?from=%2F%3Fa%3D1$/);

    await submitSignInForm(page);

    await expect(page).toHaveURL(/\/\?a=1$/);
    // installSignInApiMock's one user record satisfies auth's own schema
    // but not the hierarchy feature's (no email, a string id), so this
    // lands on the error state - see placeholder-routes.spec.ts's own
    // note on the same mock.
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'page.errorHeading',
    );
  });

  test('bounces a signed-in visitor straight off the login route', async ({
    page,
    baseURL,
  }) => {
    await installRouteMocks(page, baseURL ?? '');
    await installSignInApiMock(page);
    await signIn(page);
    await installMutationObserver(page);

    await page.goto('/login');

    await expect(page).toHaveURL(/\/$/);
    // installSignInApiMock's one user record satisfies auth's own schema
    // but not the hierarchy feature's (no email, a string id), so this
    // lands on the error state - see placeholder-routes.spec.ts's own
    // note on the same mock.
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'page.errorHeading',
    );
    const mutationLog = await readMutationLog(page);
    expect(mutationLog.some((text) => text.includes('login.heading'))).toBe(
      false,
    );
  });

  test('returns Back from the login card to where the visitor came from', async ({
    page,
    baseURL,
  }) => {
    await installRouteMocks(page, baseURL ?? '');
    await installSignInApiMock(page);

    // current-entry variant: a direct load of the guarded URL means it IS
    // the current history entry, so the guard must replace() rather than
    // push - otherwise Back would re-enter the guard instead of leaving.
    await page.goto('/this-path-does-not-exist');
    await page.goto('/');
    await expect(page).toHaveURL(/\/login\?from=%2F$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/this-path-does-not-exist$/);

    // push variant: an in-app link click means the guarded URL is a NEW
    // history entry, so the guard must push() - a replace() here would
    // overwrite the referring page's entry instead, and Back would leave
    // the app entirely.
    await page.goto('/this-path-does-not-exist');
    await page.getByRole('link', { name: 'notFound.linkHome' }).click();
    await expect(page).toHaveURL(/\/login\?from=%2F$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/this-path-does-not-exist$/);
  });

  test('ignores a protocol-relative or backslash-escaped from value', async ({
    page,
    baseURL,
  }) => {
    await installRouteMocks(page, baseURL ?? '');
    await installSignInApiMock(page);
    await signIn(page);

    await page.goto('/login?from=%2F%2Fevil.example');
    await expect(page).toHaveURL(/\/$/);

    await page.goto('/login?from=%2F%5Cevil.example');
    await expect(page).toHaveURL(/\/$/);
  });
});
