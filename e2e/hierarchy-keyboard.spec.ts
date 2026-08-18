import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { installDeferredUserMock } from './support/deferredUserMock';
import { installPopulatedHierarchyMock } from './support/hierarchyFixture';
import { installRouteMocks } from './support/routeMocks';
import { SIGN_IN_EMAIL, SIGN_IN_PASSWORD, signIn } from './support/signIn';

// The keyboard contract asserted key by key over the real rendered tree,
// focus checked by accessible name rather than described in prose
// (invariant 152) - default expansion for the populated fixture reveals
// Ronnen Gurevitch(1) > Dorit Nuhum(2) > [Andrew Crist(3), Jed Foster(4)],
// Roni Yashar(5) > Tal Bergman(6, itself collapsed - its own child,
// Persephone, is a level defaultExpansion never reaches), and
// Noa Shani(8) > Uri Barak(9).
async function tabUntilFocused(page: Page, name: RegExp): Promise<void> {
  for (let attempt = 0; attempt < 15; attempt += 1) {
    await page.keyboard.press('Tab');
    const isTarget = await page
      .getByRole('treeitem', { name })
      .evaluate((element) => element === document.activeElement);
    if (isTarget) return;
  }
  throw new Error(
    `no treeitem matching ${name.toString()} was reached by tabbing`,
  );
}

async function assertVisibleFocusIndicator(page: Page): Promise<void> {
  const outlineWidth = await page.evaluate(() => {
    const active = document.activeElement;
    return active === null ? null : getComputedStyle(active).outlineWidth;
  });
  expect(outlineWidth).not.toBeNull();
  expect(outlineWidth).not.toBe('0px');
}

function treeitem(page: Page, name: string | RegExp): Locator {
  return page.getByRole('treeitem', { name });
}

test.describe('hierarchy keyboard contract', () => {
  test('the tree is driven key by key: Tab, arrows, Home, End, type-ahead, Enter, Space and asterisk', async ({
    page,
    baseURL,
  }) => {
    await installRouteMocks(page, baseURL ?? '');
    await installPopulatedHierarchyMock(page);
    await signIn(page);
    await expect(page.getByRole('tree')).toBeVisible();

    // 130, 131: the first Tab into a freshly loaded tree lands on the
    // first visible row.
    await tabUntilFocused(page, /Ronnen Gurevitch/);
    // 145: a visible focus ring, not just a logical tab stop.
    await assertVisibleFocusIndicator(page);

    // 133: Down moves to the next visible row.
    await page.keyboard.press('ArrowDown');
    await expect(treeitem(page, /Dorit Nuhum/)).toBeFocused();

    // 134: Right on an already-expanded manager descends to its first
    // child rather than toggling anything.
    await page.keyboard.press('ArrowRight');
    await expect(treeitem(page, /Andrew Crist/)).toBeFocused();

    // 133: Down crosses to the next sibling.
    await page.keyboard.press('ArrowDown');
    await expect(treeitem(page, /Jed Foster/)).toBeFocused();

    // 135: Left on a non-manager moves to its parent.
    await page.keyboard.press('ArrowLeft');
    await expect(treeitem(page, /Dorit Nuhum/)).toBeFocused();

    // 135, 142: Left on an expanded manager collapses it in place through
    // the shared toggle implementation - focus stays, and its children
    // leave the tree.
    await page.keyboard.press('ArrowLeft');
    await expect(treeitem(page, /Dorit Nuhum/)).toBeFocused();
    await expect(treeitem(page, /Andrew Crist/)).toBeHidden();

    // 136: End moves to the last visible row.
    await page.keyboard.press('End');
    await expect(treeitem(page, /Uri Barak/)).toBeFocused();

    // 136: Home moves to the first visible row.
    await page.keyboard.press('Home');
    await expect(treeitem(page, /Ronnen Gurevitch/)).toBeFocused();

    // 138, 139: type-ahead matches the accessible name's prefix,
    // case-insensitively, from wherever focus currently sits.
    await page.keyboard.type('tal');
    await expect(treeitem(page, /Tal Bergman/)).toBeFocused();

    // 137, 142: Enter toggles the focused manager through the same
    // implementation the mouse and Right/Left use - the URL carries the
    // newly-opened branch.
    await page.keyboard.press('Enter');
    await expect(treeitem(page, /Persephone/)).toBeVisible();
    expect(page.url()).toContain('expanded=');

    // 137: Space toggles it back closed.
    await page.keyboard.press('Space');
    await expect(treeitem(page, /Persephone/)).toBeHidden();

    // 140, 141: asterisk expands every sibling under the same parent as
    // one action - Dorit is Roni's only collapsed sibling (Roni is
    // already expanded), so only Dorit's branch reopens.
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowDown');
    await expect(treeitem(page, /Dorit Nuhum/)).toBeFocused();
    const urlBeforeAsterisk = page.url();
    await page.keyboard.press('*');
    await expect(treeitem(page, /Andrew Crist/)).toBeVisible();
    expect(page.url()).not.toBe(urlBeforeAsterisk);

    // One Back undoes the whole asterisk action, not one branch at a
    // time.
    await page.goBack();
    await expect(treeitem(page, /Andrew Crist/)).toBeHidden();
  });

  test('with prefers-reduced-motion set, the loading indicator does not animate', async ({
    page,
    baseURL,
  }) => {
    await installRouteMocks(page, baseURL ?? '');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const getResolveUser = await installDeferredUserMock(page);
    await page.goto('/login');
    await page.locator('input[name="email"]').fill(SIGN_IN_EMAIL);
    await page.locator('input[name="password"]').fill(SIGN_IN_PASSWORD);
    await page.locator('form button[type="submit"]').click();
    await expect(
      page.getByRole('status', { name: 'page.loadingLabel' }),
    ).toBeVisible();

    const animationDuration = await page
      .locator(
        '[role="status"][aria-label="page.loadingLabel"] [aria-hidden="true"]',
      )
      .first()
      .evaluate((element) => getComputedStyle(element).animationDuration);

    // theme.css's global reduced-motion override sets animation-duration
    // to 0.01ms, which getComputedStyle serializes in seconds - a real
    // duration here (e.g. "1s") would mean the spinner ignored the
    // user's preference (invariant 150).
    expect(animationDuration).toBe('1e-05s');

    getResolveUser()({ status: 200, body: [] });
  });
});
