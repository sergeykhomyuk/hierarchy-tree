import { expect, test } from '@playwright/test';
import { recordConsole } from './support/consoleRecorder';
import { installRouteMocks } from './support/routeMocks';
import { installSignInApiMock, signIn } from './support/signIn';

test('an unknown path renders the not-found route with a working link home, signed out', async ({
  page,
  baseURL,
}) => {
  await installRouteMocks(page, baseURL ?? '');
  const { records } = recordConsole(page);

  await page.goto('/this-path-does-not-exist');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'notFound.title',
  );

  const homeLink = page.getByRole('link', { name: 'notFound.linkHome' });
  await expect(homeLink).toBeVisible();
  await homeLink.click();

  // / is a guarded route since M3 - signed out, the home link's own
  // destination redirects straight to the login card rather than
  // reaching the hierarchy placeholder (invariant 137: not-found's own
  // content is unchanged for both session states, but where its home
  // link actually lands legitimately differs).
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'login.heading',
  );
  expect(records).toEqual([]);
});

test('an unknown path renders the not-found route with a working link home, signed in', async ({
  page,
  baseURL,
}) => {
  await installRouteMocks(page, baseURL ?? '');
  await installSignInApiMock(page);
  await signIn(page);
  const { records } = recordConsole(page);

  await page.goto('/this-path-does-not-exist');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'notFound.title',
  );

  const homeLink = page.getByRole('link', { name: 'notFound.linkHome' });
  await expect(homeLink).toBeVisible();
  await homeLink.click();

  // installSignInApiMock's one user record satisfies auth's own schema
  // but not the hierarchy feature's (no email, a string id), so this
  // lands on the error state - see placeholder-routes.spec.ts's own
  // note on the same mock.
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'page.errorHeading',
  );
  expect(records).toEqual([]);
});
