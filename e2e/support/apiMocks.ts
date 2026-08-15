import type { Page, Route } from '@playwright/test';

// Mirrors configurationSchema.ts's VITE_API_BASE_URL default - the value
// baked into the preview build these e2e specs run against, since no
// .env overrides it. A different origin from the app's own baseURL, so
// routeMocks.ts's off-origin block would abort every request here unless
// this installs its own route on top of it (Playwright resolves routes in
// the reverse of their registration order, so calling this AFTER
// installRouteMocks lets these two paths win over the catch-all abort).
const API_ORIGIN = 'https://gongfetest.firebaseio.com';

export type ApiMockResponse = { status: number; body: unknown } | 'abort';

export type ApiMockHandlers = {
  secret: (secret: string) => ApiMockResponse | Promise<ApiMockResponse>;
  user?: (userId: string) => ApiMockResponse | Promise<ApiMockResponse>;
};

function pathSegment(url: string): string {
  const segments = new URL(url).pathname.split('/');
  const lastSegment = segments[segments.length - 1];
  if (lastSegment === undefined) {
    throw new Error(`unexpected empty path in mocked request: ${url}`);
  }
  return decodeURIComponent(lastSegment.replace(/\.json$/, ''));
}

async function fulfillOrAbort(
  route: Route,
  response: ApiMockResponse,
): Promise<void> {
  if (response === 'abort') {
    await route.abort();
    return;
  }
  await route.fulfill({
    status: response.status,
    contentType: 'application/json',
    body: JSON.stringify(response.body),
  });
}

export async function installApiMocks(
  page: Page,
  handlers: ApiMockHandlers,
): Promise<void> {
  await page.route(`${API_ORIGIN}/secrets/*.json`, async (route) => {
    const response = await handlers.secret(pathSegment(route.request().url()));
    await fulfillOrAbort(route, response);
  });

  await page.route(`${API_ORIGIN}/users/*.json`, async (route) => {
    const handleUser = handlers.user;
    if (!handleUser) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'null',
      });
      return;
    }
    const response = await handleUser(pathSegment(route.request().url()));
    await fulfillOrAbort(route, response);
  });
}
