import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { deriveSecret } from '../src/features/auth/domain/deriveSecret';
import type { ApiMockResponse } from './support/apiMocks';
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

// Holds the user request open until the test chooses to settle it, so a
// pending name can be observed before deciding how it resolves - the
// login card's own `mode = 'hang'` pattern (login.spec.ts), applied to
// the header's fetch instead of the sign-in request.
async function installDeferredUserMock(
  page: Page,
): Promise<() => (response: ApiMockResponse) => void> {
  let resolveUser: ((response: ApiMockResponse) => void) | undefined;
  await installApiMocks(page, {
    secret: (secret) => ({
      status: 200,
      body: secret === MATCHING_SECRET ? SIGN_IN_USER_ID : null,
    }),
    user: () =>
      new Promise<ApiMockResponse>((resolve) => {
        resolveUser = resolve;
      }),
  });
  return () => {
    if (resolveUser === undefined) {
      throw new Error('the user request has not been made yet');
    }
    return resolveUser;
  };
}

async function submitSignInForm(page: Page): Promise<void> {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(SIGN_IN_EMAIL);
  await page.locator('input[name="password"]').fill(SIGN_IN_PASSWORD);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.includes('login'));
}

test.describe('the signed-in header', () => {
  test('shows the skeleton, then the resolved name and initials', async ({
    page,
    baseURL,
  }) => {
    await installRouteMocks(page, baseURL ?? '');
    const getResolveUser = await installDeferredUserMock(page);

    await submitSignInForm(page);

    await expect(page.getByLabel('header.nameLoading')).toBeVisible();
    const skeletonBox = await page
      .locator('header [aria-busy="true"] [aria-hidden="true"]')
      .first()
      .boundingBox();
    expect(skeletonBox).not.toBeNull();

    getResolveUser()({
      status: 200,
      body: [{ id: SIGN_IN_USER_ID, firstName: 'Ada', lastName: 'Lovelace' }],
    });

    await expect(page.getByText('Ada Lovelace')).toBeVisible();
    const resolvedBox = await page
      .locator('header')
      .getByText('AL', { exact: true })
      .boundingBox();
    expect(resolvedBox).not.toBeNull();
    expect(resolvedBox?.width).toBe(skeletonBox?.width);
    expect(resolvedBox?.height).toBe(skeletonBox?.height);
  });

  test('renders the neutral presentation and the page beneath when the name cannot resolve', async ({
    page,
    baseURL,
  }) => {
    await installRouteMocks(page, baseURL ?? '');
    const getResolveUser = await installDeferredUserMock(page);

    await submitSignInForm(page);

    const skeletonBox = await page
      .locator('header [aria-busy="true"] [aria-hidden="true"]')
      .first()
      .boundingBox();

    // An empty collection rather than a 5xx status: a GET retries once on
    // a 5xx (shouldRetry.ts, the same behaviour login.spec.ts's
    // service-problem test exercises for the secret endpoint), which
    // would leave this single-resolution deferred mock's second, retried
    // request pending forever. A well-formed collection with no matching
    // id is not in shouldRetry's retryable set, so it settles in one
    // request and resolves the same "cannot resolve a name" outcome.
    getResolveUser()({ status: 200, body: [] });

    await expect(page.getByText('header.signedInFallback')).toBeVisible();
    await expect(page.getByLabel('header.nameLoading')).toHaveCount(0);

    const failedBox = await page
      .locator('header [aria-hidden="true"]')
      .first()
      .boundingBox();
    expect(failedBox).not.toBeNull();
    expect(failedBox?.width).toBe(skeletonBox?.width);
    expect(failedBox?.height).toBe(skeletonBox?.height);

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'home.title',
    );
    await expect(page.getByRole('alert')).toHaveCount(0);
  });

  test('requests the user record once across two authenticated navigations', async ({
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
        return {
          status: 200,
          body: [
            { id: SIGN_IN_USER_ID, firstName: 'Ada', lastName: 'Lovelace' },
          ],
        };
      },
    });

    await submitSignInForm(page);
    await expect(page.getByText('Ada Lovelace')).toBeVisible();
    expect(userRequestCount).toBe(1);

    // Simulates a second navigation into the authenticated route without
    // a page reload: the same mechanism createBackForwardRestore.ts wires
    // to a real bfcache pageshow, fired here synthetically to re-run the
    // loader (invariant 97b - "not once per navigation") while staying on
    // the same page lifetime the signedInUserStore is scoped to.
    await page.evaluate(() => {
      window.dispatchEvent(
        new PageTransitionEvent('pageshow', { persisted: true }),
      );
    });

    await expect(page.getByText('Ada Lovelace')).toBeVisible();
    expect(userRequestCount).toBe(1);
  });

  test('signs in and out entirely from the keyboard', async ({
    page,
    baseURL,
  }) => {
    await installRouteMocks(page, baseURL ?? '');
    await installSignInApiMock(page);

    async function assertVisibleFocusIndicator(): Promise<void> {
      const outlineWidth = await page.evaluate(() => {
        const active = document.activeElement;
        return active === null ? null : getComputedStyle(active).outlineWidth;
      });
      expect(outlineWidth).not.toBeNull();
      expect(outlineWidth).not.toBe('0px');
    }

    async function tabToLogout(): Promise<void> {
      for (let attempt = 0; attempt < 8; attempt += 1) {
        await page.keyboard.press('Tab');
        const isLogout = await page.evaluate(
          () => document.activeElement?.textContent === 'header.logout',
        );
        // eslint-disable-next-line playwright/no-conditional-in-test -- a bounded "tab until the target is reached" loop, not a branch on test outcome; the exact tab count to the logout control is not a stable thing to hardcode.
        if (isLogout) return;
      }
      throw new Error('the logout control was not reached by tabbing');
    }

    for (const activationKey of ['Enter', 'Space'] as const) {
      await page.goto('/login');
      await page.locator('input[name="email"]').focus();
      await assertVisibleFocusIndicator();
      await page.keyboard.type(SIGN_IN_EMAIL);
      await page.keyboard.press('Tab');
      await assertVisibleFocusIndicator();
      await page.keyboard.type(SIGN_IN_PASSWORD);
      await page.keyboard.press('Enter');

      await page.waitForURL((url) => !url.pathname.includes('login'));
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

      await tabToLogout();
      await assertVisibleFocusIndicator();
      await page.keyboard.press(activationKey);

      await page.waitForURL((url) => url.pathname.includes('login'));
      await expect(page.locator('input[name="email"]')).toHaveValue('');
      await expect(page.locator('input[name="password"]')).toHaveValue('');
    }
  });

  test('does not return to an authenticated view with Back after signing out', async ({
    page,
    baseURL,
  }) => {
    await installRouteMocks(page, baseURL ?? '');
    await installSignInApiMock(page);
    await installMutationObserver(page);

    await signIn(page);
    // A distinguishing query string, not a bare reload of the URL already
    // shown post sign-in - Playwright/Chromium may coalesce two
    // navigations to an identical URL, and guard.spec.ts's own precedent
    // uses the same trick to force a genuinely new history entry.
    await page.goto('/?a=1');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'home.title',
    );

    await page.getByRole('button', { name: 'header.logout' }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goBack();

    await expect(page).toHaveURL(/\/login\?from=/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'login.heading',
    );
    const mutationLog = await readMutationLog(page);
    expect(mutationLog.some((text) => text.includes('home.title'))).toBe(false);
  });
});
