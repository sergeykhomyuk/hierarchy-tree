import type { Page } from '@playwright/test';

// Installed with page.addInitScript BEFORE navigation, so the override runs
// before any application script. Overriding the `dir` property itself
// (rather than writing the attribute once) is what makes it survive the
// application's own startup write to `dir` - a plain pre-navigation write
// would otherwise be reset the moment ApplicationRoot mounts.
export async function forceDirection(
  page: Page,
  direction: 'ltr' | 'rtl',
): Promise<void> {
  await page.addInitScript((forcedDirection) => {
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
