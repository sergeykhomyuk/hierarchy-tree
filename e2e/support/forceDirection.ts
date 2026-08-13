import type { Page } from '@playwright/test';

// Installed via page.evaluate AFTER navigation, not page.addInitScript
// before it: a full navigation gives the document a genuinely new
// `documentElement` once HTML parsing completes, discarding whatever
// addInitScript ran against pre-parse - confirmed empirically, an
// addInitScript-installed override on `dir` does not survive to the
// loaded page. Once installed here, the override DOES survive
// ApplicationRoot's own effect: call this after the page has rendered
// (ApplicationRoot's effect has already run once, setting the real
// locale's direction), and the override below makes any further write to
// `dir` a no-op, so nothing resets it afterward - the effect only re-runs
// on a language change, which never happens in this phase.
export async function forceDirection(
  page: Page,
  direction: 'ltr' | 'rtl',
): Promise<void> {
  await page.evaluate((forcedDirection) => {
    const documentElement = document.documentElement;

    Object.defineProperty(documentElement, 'dir', {
      configurable: true,
      get: () => forcedDirection,
      set: () => {
        // Ignore application writes; the forced direction is the point.
      },
    });

    documentElement.setAttribute('dir', forcedDirection);
  }, direction);
}
