import type { Page } from '@playwright/test';
import { deriveSecret } from '../../src/features/auth/domain/deriveSecret';
import type { ApiMockResponse } from './apiMocks';
import { installApiMocks } from './apiMocks';
import { SIGN_IN_EMAIL, SIGN_IN_PASSWORD, SIGN_IN_USER_ID } from './signIn';

const MATCHING_SECRET = deriveSecret(SIGN_IN_EMAIL, SIGN_IN_PASSWORD);

// Holds the user request open until the caller chooses to settle it, so a
// pending name can be observed before deciding how it resolves - the
// login card's own `mode = 'hang'` pattern (login.spec.ts), applied to
// the header's fetch instead of the sign-in request. Since M3, landing on
// / issues TWO independent requests to the same /users.json path - the
// header's own signed-in-name lookup and the hierarchy page's own
// repository fetch - so this queues every request made before the caller
// settles it, and remembers the response for any request made after, so
// neither one is left permanently pending regardless of arrival order.
export async function installDeferredUserMock(
  page: Page,
): Promise<() => (response: ApiMockResponse) => void> {
  let settledResponse: ApiMockResponse | undefined;
  const pendingResolvers: Array<(response: ApiMockResponse) => void> = [];

  await installApiMocks(page, {
    secret: (secret) => ({
      status: 200,
      body: secret === MATCHING_SECRET ? SIGN_IN_USER_ID : null,
    }),
    user: () =>
      new Promise<ApiMockResponse>((resolve) => {
        if (settledResponse !== undefined) {
          resolve(settledResponse);
          return;
        }
        pendingResolvers.push(resolve);
      }),
  });

  return () => (response: ApiMockResponse) => {
    settledResponse = response;
    for (const resolve of pendingResolvers.splice(0)) {
      resolve(response);
    }
  };
}

export async function submitSignInForm(page: Page): Promise<void> {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(SIGN_IN_EMAIL);
  await page.locator('input[name="password"]').fill(SIGN_IN_PASSWORD);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.includes('login'));
}
