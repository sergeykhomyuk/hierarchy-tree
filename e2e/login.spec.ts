import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { deriveSecret } from '../src/features/auth/domain/deriveSecret';
import { assertNoCredentialLeak } from './support/assertNoCredentialLeak';
import { createAxeBuilder } from './support/axeBuilder';
import { installApiMocks } from './support/apiMocks';
import { installRouteMocks } from './support/routeMocks';
import './support/telemetryWindow';

const EMAIL = 'e2e-user@example.com';
const PASSWORD = 'e2e-password-123';
const WRONG_PASSWORD = 'wrong-password';
const USER_ID = 'e2e-user-1';
const MATCHING_SECRET = deriveSecret(EMAIL, PASSWORD);

async function assertAccessible(page: Page): Promise<void> {
  const results = await createAxeBuilder(page).analyze();
  expect(results.violations).toEqual([]);
}

test.describe('the login card', () => {
  test('signs in with a real-shaped credential and lands on the hierarchy page', async ({
    page,
    baseURL,
  }) => {
    await installRouteMocks(page, baseURL ?? '');
    await installApiMocks(page, {
      secret: (secret) => ({
        status: 200,
        body: secret === MATCHING_SECRET ? USER_ID : null,
      }),
    });

    await page.goto('/login');
    await page.getByLabel('login.emailLabel').fill(EMAIL);
    await page.getByLabel('login.passwordLabel').fill(PASSWORD);
    await page.getByRole('button', { name: 'login.submit' }).click();

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'home.title',
    );
    expect(new URL(page.url()).pathname).toBe('/');
  });

  test('shows the no-match alert for a null lookup and stays on /login', async ({
    page,
    baseURL,
  }) => {
    await installRouteMocks(page, baseURL ?? '');
    await installApiMocks(page, {
      secret: () => ({ status: 200, body: null }),
    });

    await page.goto('/login');
    await page.getByLabel('login.emailLabel').fill(EMAIL);
    await page.getByLabel('login.passwordLabel').fill(WRONG_PASSWORD);
    await page.getByRole('button', { name: 'login.submit' }).click();

    await expect(page.getByRole('alert')).toHaveText('login.noMatchMessage');
    expect(new URL(page.url()).pathname).toBe('/login');
  });

  test('shows the service-problem alert and retries successfully', async ({
    page,
    baseURL,
  }) => {
    await installRouteMocks(page, baseURL ?? '');
    // The http client retries once on its own for a 5xx GET (shouldRetry),
    // invisibly to the visitor, so both the initial click's attempts must
    // fail before the manual Retry control appears; only the third call -
    // the one that control triggers - succeeds.
    let secretCallCount = 0;
    await installApiMocks(page, {
      secret: (secret) => {
        secretCallCount += 1;
        if (secretCallCount <= 2) {
          return { status: 500, body: null };
        }
        return {
          status: 200,
          body: secret === MATCHING_SECRET ? USER_ID : null,
        };
      },
    });

    await page.goto('/login');
    await page.getByLabel('login.emailLabel').fill(EMAIL);
    await page.getByLabel('login.passwordLabel').fill(PASSWORD);
    await page.getByRole('button', { name: 'login.submit' }).click();

    await expect(page.getByRole('alert')).toContainText(
      'login.serviceProblemMessage',
    );

    await page.getByRole('button', { name: 'login.retry' }).click();

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'home.title',
    );
    expect(secretCallCount).toBe(3);
  });

  test('issues exactly one secrets request while authenticating, and exactly one users request from the landing route', async ({
    page,
    baseURL,
  }) => {
    await installRouteMocks(page, baseURL ?? '');
    let secretRequestCount = 0;
    let userRequestCount = 0;
    await installApiMocks(page, {
      secret: (secret) => {
        secretRequestCount += 1;
        return {
          status: 200,
          body: secret === MATCHING_SECRET ? USER_ID : null,
        };
      },
      user: () => {
        userRequestCount += 1;
        return { status: 200, body: [] };
      },
    });

    await page.goto('/login');
    await page.getByLabel('login.emailLabel').fill(EMAIL);
    await page.getByLabel('login.passwordLabel').fill(PASSWORD);
    await page.getByRole('button', { name: 'login.submit' }).click();

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'home.title',
    );

    expect(secretRequestCount).toBe(1);
    // Exactly one, not zero: the authenticated route's own loader (M3)
    // fetches the signed-in user's record once landing on / - the
    // sign-in flow itself still never touches the users path, only the
    // subsequent navigation's loader does.
    expect(userRequestCount).toBe(1);
  });

  test('leaves no credential material in the telemetry buffer or storage', async ({
    page,
    baseURL,
  }) => {
    await installRouteMocks(page, baseURL ?? '');
    await installApiMocks(page, {
      secret: (secret) => ({
        status: 200,
        body: secret === MATCHING_SECRET ? USER_ID : null,
      }),
    });

    await page.goto('/login');
    await page.getByLabel('login.emailLabel').fill(EMAIL);
    await page.getByLabel('login.passwordLabel').fill(PASSWORD);
    await page.getByRole('button', { name: 'login.submit' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'home.title',
    );

    const credentials = {
      email: EMAIL,
      password: PASSWORD,
      secret: MATCHING_SECRET,
    };

    // Every surface invariants 125, 129 and 131 name, each checked for
    // both a whole-value leak and any twelve-character window of a
    // credential (section 9) - not just the two surfaces (telemetry,
    // storage) the original version of this test covered.
    const records = await page.evaluate(
      () => window.__hierarchyTreeTelemetry?.read() ?? [],
    );
    assertNoCredentialLeak(
      JSON.stringify(records),
      credentials,
      'the telemetry buffer',
    );

    const storageDump = await page.evaluate(() =>
      JSON.stringify(window.sessionStorage),
    );
    assertNoCredentialLeak(storageDump, credentials, 'sessionStorage');

    const locationHref = await page.evaluate(() => window.location.href);
    assertNoCredentialLeak(locationHref, credentials, 'location.href');

    const documentTitle = await page.evaluate(() => document.title);
    assertNoCredentialLeak(documentTitle, credentials, 'document.title');

    const historyState = await page.evaluate(() =>
      JSON.stringify(history.state),
    );
    assertNoCredentialLeak(historyState, credentials, 'history.state');

    const serializedDom = await page.evaluate(
      () => document.documentElement.outerHTML,
    );
    assertNoCredentialLeak(serializedDom, credentials, 'the serialised DOM');
  });

  test('passes an accessibility scan in each of its five states', async ({
    page,
    baseURL,
  }) => {
    await installRouteMocks(page, baseURL ?? '');

    let mode: 'noMatch' | 'serviceProblem' | 'hang' = 'noMatch';
    await installApiMocks(page, {
      secret: () => {
        if (mode === 'hang') {
          return new Promise<never>(() => {});
        }
        if (mode === 'serviceProblem') {
          return { status: 500, body: null };
        }
        return { status: 200, body: null };
      },
    });

    const email = page.getByLabel('login.emailLabel');
    const password = page.getByLabel('login.passwordLabel');
    const submitButton = page.getByRole('button', { name: 'login.submit' });

    // Invariant 111 asks for both themes, not just whichever the browser
    // context defaults to - each theme runs the whole five-state sequence
    // from a fresh idle load rather than sharing state across themes.
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme });

      // idle
      mode = 'noMatch';
      await page.goto('/login');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        'login.heading',
      );
      await assertAccessible(page);

      // ready
      await email.fill(EMAIL);
      await password.fill(PASSWORD);
      await expect(submitButton).toBeEnabled();
      await assertAccessible(page);

      // submitting - the route never resolves, so the card stays busy for
      // the rest of this state's assertions; the next state's page.goto
      // discards the still-pending request rather than waiting it out.
      mode = 'hang';
      await submitButton.click();
      await expect(
        page.getByRole('button', { name: 'login.submitting' }),
      ).toBeVisible();
      await assertAccessible(page);

      // noMatch
      mode = 'noMatch';
      await page.goto('/login');
      await email.fill(EMAIL);
      await password.fill(WRONG_PASSWORD);
      await submitButton.click();
      await expect(page.getByRole('alert')).toBeVisible();
      await assertAccessible(page);

      // serviceProblem - resubmitted with the same (still-filled) fields,
      // matching the retry path's own re-derive-in-place behaviour.
      mode = 'serviceProblem';
      await submitButton.click();
      await expect(page.getByRole('alert')).toContainText(
        'login.serviceProblemMessage',
      );
      await assertAccessible(page);
    }
  });
});
