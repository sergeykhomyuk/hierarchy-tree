import type { Page } from '@playwright/test'

// A development-transport allowance for Vite's HMR websocket in the
// `development` project, not a console allow-list entry.
const ALLOWED_WEBSOCKET_ORIGINS = ['ws://127.0.0.1:4174']

export async function installRouteMocks(page: Page, baseURL: string): Promise<void> {
  const allowedOrigin = new URL(baseURL).origin

  await page.route('**/*', async (route) => {
    const requestUrl = new URL(route.request().url())
    const isSameOrigin = requestUrl.origin === allowedOrigin
    const isAllowedWebSocket = ALLOWED_WEBSOCKET_ORIGINS.includes(requestUrl.origin)

    if (isSameOrigin || isAllowedWebSocket) {
      await route.continue()
      return
    }

    // An accidental live request fails the test rather than succeeding
    // silently (invariant 115).
    await route.abort()
  })
}
