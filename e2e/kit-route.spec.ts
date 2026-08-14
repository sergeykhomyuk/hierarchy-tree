import { expect, test } from '@playwright/test';
import { createAxeBuilder } from './support/axeBuilder';
import { forceDirection } from './support/forceDirection';
import { installRouteMocks } from './support/routeMocks';

// Exists only when configuration.developmentRoutes is on, which defaults
// to true in development mode alone - this spec therefore runs in the
// `development` project against `npm run dev` (playwright.config.ts).
test.describe('kit route', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test('renders every documented state with no horizontal overflow', async ({
    page,
    baseURL,
  }) => {
    await installRouteMocks(page, baseURL ?? '');

    await page.goto('/__kit');
    await expect(page.getByRole('region').first()).toBeVisible();

    const overflowsHorizontally = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(overflowsHorizontally).toBe(false);
  });

  test('has zero axe violations in real light', async ({ page, baseURL }) => {
    await installRouteMocks(page, baseURL ?? '');
    await page.emulateMedia({ colorScheme: 'light' });

    await page.goto('/__kit');
    await expect(page.getByRole('region').first()).toBeVisible();

    // page-has-heading-one is a best-practice check for a document; this
    // route is deliberately not one - invariant 86a names "no navigation,
    // no documentation prose" as the point, and a heading here would be
    // exactly that.
    const results = await createAxeBuilder(page)
      .disableRules(['page-has-heading-one'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('has zero axe violations in real dark', async ({ page, baseURL }) => {
    await installRouteMocks(page, baseURL ?? '');
    await page.emulateMedia({ colorScheme: 'dark' });

    await page.goto('/__kit');
    await expect(page.getByRole('region').first()).toBeVisible();

    const results = await createAxeBuilder(page)
      .disableRules(['page-has-heading-one'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('a skeleton box equals the box of the content it stands in for', async ({
    page,
    baseURL,
  }) => {
    await installRouteMocks(page, baseURL ?? '');

    await page.goto('/__kit');

    // Skeleton's `circle`/`avatar` size token (sizeClass.ts: h-[34px]
    // w-[34px]) is the same literal class pair Avatar's `medium` size
    // uses - the "closed set of kit-local size tokens shared with the
    // content" invariant 76 requires. This is the browser measurement
    // that proves swapping one for the other produces no layout shift.
    const skeletonBox = await page
      .locator('section[aria-label="Skeleton circle"] > span')
      .boundingBox();
    const avatarBox = await page
      .locator('section[aria-label="Avatar initials fallback"] > span')
      .boundingBox();

    expect(skeletonBox).not.toBeNull();
    expect(avatarBox).not.toBeNull();
    expect(skeletonBox?.width).toBe(avatarBox?.width);
    expect(skeletonBox?.height).toBe(avatarBox?.height);
  });

  test('mirrors correctly under a forced right-to-left direction', async ({
    page,
    baseURL,
  }) => {
    await installRouteMocks(page, baseURL ?? '');

    await page.goto('/__kit');
    await expect(page.getByRole('region').first()).toBeVisible();

    await forceDirection(page, 'rtl');
    expect(await page.evaluate(() => document.documentElement.dir)).toBe('rtl');

    const overflowsHorizontally = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(overflowsHorizontally).toBe(false);

    const results = await createAxeBuilder(page)
      .disableRules(['page-has-heading-one'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
