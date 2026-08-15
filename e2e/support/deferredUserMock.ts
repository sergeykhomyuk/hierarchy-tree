import type { Page } from '@playwright/test';
import { deriveSecret } from '../../src/features/auth/domain/deriveSecret';
import type { ApiMockResponse } from './apiMocks';
import { installApiMocks } from './apiMocks';
import { SIGN_IN_EMAIL, SIGN_IN_PASSWORD, SIGN_IN_USER_ID } from './signIn';

const MATCHING_SECRET = deriveSecret(SIGN_IN_EMAIL, SIGN_IN_PASSWORD);

// Holds the user request open until the caller chooses to settle it, so a
// pending name can be observed before deciding how it resolves - the
// login card's own `mode = 'hang'` pattern (login.spec.ts), applied to
// the header's fetch instead of the sign-in request.
export async function installDeferredUserMock(
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

export async function submitSignInForm(page: Page): Promise<void> {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(SIGN_IN_EMAIL);
  await page.locator('input[name="password"]').fill(SIGN_IN_PASSWORD);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.includes('login'));
}
