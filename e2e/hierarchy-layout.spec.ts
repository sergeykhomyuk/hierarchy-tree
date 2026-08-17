import { expect, test } from '@playwright/test';
import {
  installDeferredUserMock,
  submitSignInForm,
} from './support/deferredUserMock';
import {
  installHierarchyUserMock,
  installPopulatedHierarchyMock,
  populatedHierarchyPayload,
} from './support/hierarchyFixture';
import { installRouteMocks } from './support/routeMocks';
import { installSignInApiMock, signIn } from './support/signIn';

// The three layout claims jsdom cannot make - getBoundingClientRect()
// returns all-zero rects there and there is no real scrolling - so all
// three live here instead, against a real, schema-valid nested payload
// (TECH.md's own note: no other e2e mock in this suite produces the
// Data state at all, only Error or Empty).
test.describe('hierarchy layout', () => {
  test('the header, nav rail and card frame have identical bounding boxes before and after the data resolves', async ({
    page,
    baseURL,
  }) => {
    await installRouteMocks(page, baseURL ?? '');
    const getResolveUser = await installDeferredUserMock(page);
    await submitSignInForm(page);
    await expect(
      page.getByRole('status', { name: 'page.loadingLabel' }),
    ).toBeVisible();

    // A plain tag locator, not getByRole('banner') - <header> nested
    // inside ApplicationLayout's <main> loses its implicit banner role
    // per the ARIA landmark-nesting rule, even though it is still the
    // one and only <header> the page renders.
    const header = page.locator('header');
    const navRail = page.getByTestId('navigation-rail');
    const cardFrame = page.getByTestId('hierarchy-card-frame');
    const before = {
      header: await header.boundingBox(),
      navRail: await navRail.boundingBox(),
      cardFrame: await cardFrame.boundingBox(),
    };

    getResolveUser()({ status: 200, body: populatedHierarchyPayload() });
    await expect(page.getByRole('tree')).toBeVisible();

    expect(await header.boundingBox()).toEqual(before.header);
    expect(await navRail.boundingBox()).toEqual(before.navRail);
    expect(await cardFrame.boundingBox()).toEqual(before.cardFrame);
  });

  test('toggling a branch does not move the scroll position of the rows above it', async ({
    page,
    baseURL,
  }) => {
    await installRouteMocks(page, baseURL ?? '');
    await installPopulatedHierarchyMock(page);
    await signIn(page);
    // The row list is its own fixed-height scrollable region, not the
    // page (invariant 64's own reason: the card frame's height must
    // never depend on row count) - the "scroll position" this test rules
    // out moving is this container's scrollTop, not window.scrollY.
    const treeList = page.getByRole('tree');
    await expect(treeList).toBeVisible();

    // The very first row - above every other row in the list, so nothing
    // toggled below it should ever move it.
    const anchorRow = page.getByRole('treeitem', { name: /Ronnen Gurevitch/ });
    // Noa Shani is the second root, near the end of the row list -
    // definitely below the fold of the capped row list, so reaching its
    // toggle needs a real scroll. Collapsing it (it has its own child,
    // Uri Barak) changes only the rows beneath it.
    const targetRow = page.getByRole('treeitem', { name: /Noa Shani/ });
    const targetToggle = targetRow.locator('button');

    // scrollIntoViewIfNeeded() scrolls the row list's own container, not
    // the page - done BEFORE capturing state so the click below performs
    // no further auto-scroll of its own, which would otherwise show up
    // as the exact scroll movement this test means to rule out.
    await targetToggle.scrollIntoViewIfNeeded();
    await expect(targetToggle).toBeInViewport();

    const beforeAnchorTop = (await anchorRow.boundingBox())?.y;
    const beforeScrollTop = await treeList.evaluate(
      (element) => element.scrollTop,
    );
    // A precondition, not the claim under test: without it, a row list
    // that never actually needed to scroll would pass the assertions
    // below vacuously, proving nothing about what toggling does to a
    // real scroll offset.
    expect(beforeScrollTop).toBeGreaterThan(0);

    await targetToggle.click();

    expect(await treeList.evaluate((element) => element.scrollTop)).toBe(
      beforeScrollTop,
    );
    expect((await anchorRow.boundingBox())?.y).toBe(beforeAnchorTop);
  });

  test('the name, email and count stay on one line at 320, 768 and 1280 px', async ({
    page,
    baseURL,
  }) => {
    await installRouteMocks(page, baseURL ?? '');
    await installPopulatedHierarchyMock(page);
    await signIn(page);
    await expect(page.getByRole('tree')).toBeVisible();

    // Tal Bergman is the deepest MANAGER row the default expansion
    // already reveals (its parent, Roni Yashar, auto-expands as a root's
    // direct child with children of its own) - the deepest row that
    // still shows all three of name, email and count. A leaf one level
    // deeper never renders a count at all, so it cannot stand in here.
    const deepestManagerRow = page.getByRole('treeitem', {
      name: /Tal Bergman/,
    });
    await expect(deepestManagerRow).toBeVisible();

    for (const width of [320, 768, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      for (const paragraph of await deepestManagerRow.locator('p').all()) {
        const [scrollHeight, clientHeight] = await Promise.all([
          paragraph.evaluate((element) => element.scrollHeight),
          paragraph.evaluate((element) => element.clientHeight),
        ]);
        // A wrapped line grows scrollHeight past clientHeight; truncate's
        // white-space: nowrap keeps them equal regardless of how much
        // text is clipped by the ellipsis.
        expect(scrollHeight).toBeLessThanOrEqual(clientHeight);
      }
    }
  });

  // Not one of the three layout claims above - screenshot evidence for
  // the G3 design comparison against mockups 1e-1h (invariant 181, "the
  // mockups are illustrative", checked there rather than pixel-matched
  // here).
  test('captures a screenshot of each of the four states', async ({
    page,
    baseURL,
  }) => {
    await installRouteMocks(page, baseURL ?? '');
    const getResolveUser = await installDeferredUserMock(page);
    await submitSignInForm(page);
    await expect(
      page.getByRole('status', { name: 'page.loadingLabel' }),
    ).toBeVisible();
    await page.screenshot({
      path: 'test-results/hierarchy-layout-loading.png',
    });

    getResolveUser()({ status: 200, body: populatedHierarchyPayload() });
    await expect(page.getByRole('tree')).toBeVisible();
    await page.screenshot({ path: 'test-results/hierarchy-layout-data.png' });
  });

  test('captures a screenshot of the error state', async ({
    page,
    baseURL,
  }) => {
    await installRouteMocks(page, baseURL ?? '');
    // installSignInApiMock's one user record satisfies auth's own schema
    // but not the hierarchy feature's (no email, a string id) - the same
    // established route to the error state right-to-left.spec.ts and
    // accessibility.spec.ts already use.
    await installSignInApiMock(page);
    await signIn(page);
    await expect(page.getByRole('alert')).toBeVisible();
    await page.screenshot({ path: 'test-results/hierarchy-layout-error.png' });
  });

  test('captures a screenshot of the empty state', async ({
    page,
    baseURL,
  }) => {
    await installRouteMocks(page, baseURL ?? '');
    await installHierarchyUserMock(page, { status: 200, body: [] });
    await signIn(page);
    await expect(page.getByText('page.emptyHeading')).toBeVisible();
    await page.screenshot({ path: 'test-results/hierarchy-layout-empty.png' });
  });
});
