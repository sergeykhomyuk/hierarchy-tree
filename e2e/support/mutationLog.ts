import type { Page } from '@playwright/test';

// Records the textContent of every node inserted into the document for
// the life of the page - installed via page.addInitScript BEFORE any
// navigation, so it catches a guarded route's content even if it were
// inserted and removed within a single frame (invariant 86). A
// domcontentloaded snapshot plus a later count check samples two
// discrete moments and is blind to anything in between; this observer
// is not.
export async function installMutationObserver(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__mutationLog = [];
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          window.__mutationLog?.push(node.textContent ?? '');
        }
      }
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  });
}

export async function readMutationLog(page: Page): Promise<string[]> {
  return page.evaluate(() => window.__mutationLog ?? []);
}

declare global {
  interface Window {
    __mutationLog?: string[];
  }
}
