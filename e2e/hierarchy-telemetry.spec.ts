import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { recordConsole } from './support/consoleRecorder';
import {
  installHierarchyUserMock,
  installPopulatedHierarchyMock,
} from './support/hierarchyFixture';
import { installRouteMocks } from './support/routeMocks';
import { signIn } from './support/signIn';
import './support/telemetryWindow';
import type { TelemetryRecord } from './support/telemetryWindow';

async function readBuffer(page: Page): Promise<readonly TelemetryRecord[]> {
  return page.evaluate(() => window.__hierarchyTreeTelemetry?.read() ?? []);
}

function analyticsNamed(
  records: readonly TelemetryRecord[],
  name: string,
): TelemetryRecord[] {
  return records.filter(
    (record) => record.kind === 'analytics' && record.name === name,
  );
}

async function activeElementRole(page: Page): Promise<string | null> {
  return page.evaluate(
    () => document.activeElement?.getAttribute('role') ?? null,
  );
}

// The tree is a single tab stop (invariant 130): Tab enters it once,
// landing on the first visible row, and every row after that is reached
// with ArrowDown, never with further Tabs. The header's logout button
// sits before the tree in tab order, so entering the tree can take more
// than one Tab.
async function focusTreeRow(page: Page, name: RegExp): Promise<void> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await page.keyboard.press('Tab');
    if ((await activeElementRole(page)) === 'treeitem') break;
  }

  for (let attempt = 0; attempt < 15; attempt += 1) {
    const isTarget = await page
      .getByRole('treeitem', { name })
      .evaluate((element) => element === document.activeElement);
    if (isTarget) return;
    await page.keyboard.press('ArrowDown');
  }
  throw new Error(
    `no treeitem matching ${name.toString()} was reached by arrowing down`,
  );
}

test.describe('hierarchy telemetry and privacy', () => {
  test('the buffer holds one hierarchy-viewed event and one toggle event per toggle and no additional route-viewed event', async ({
    page,
    baseURL,
  }) => {
    await installRouteMocks(page, baseURL ?? '');
    await installPopulatedHierarchyMock(page);
    await signIn(page);
    await expect(page.getByRole('tree')).toBeVisible();

    // The sign-in flow itself is two navigations (/login, then /), so it
    // is its own baseline of route_viewed events - the invariant under
    // test is that TOGGLING adds none on top of that baseline, not that
    // the whole journey produces exactly one.
    const routeViewedBeforeToggle = analyticsNamed(
      await readBuffer(page),
      'app.route_viewed',
    ).length;
    expect(routeViewedBeforeToggle).toBeGreaterThan(0);

    // Tal Bergman is a manager one level below a root's direct child, so
    // defaultExpansion leaves it collapsed - toggling it is a real state
    // change, not a no-op the buffer would show zero events for.
    await focusTreeRow(page, /Tal Bergman/);
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('treeitem', { name: /Persephone/ }),
    ).toBeVisible();

    const recordsAfterFirstToggle = await readBuffer(page);

    expect(
      analyticsNamed(recordsAfterFirstToggle, 'app.route_viewed'),
    ).toHaveLength(routeViewedBeforeToggle);
    expect(
      analyticsNamed(recordsAfterFirstToggle, 'hierarchy.viewed'),
    ).toHaveLength(1);
    expect(
      analyticsNamed(recordsAfterFirstToggle, 'hierarchy.toggled'),
    ).toHaveLength(1);

    // A second toggle (collapsing Tal Bergman back) proves "one event PER
    // toggle" as a general rule, not just that a single toggle produces a
    // single event - a bug that always pushed exactly one event
    // regardless of how many toggles happened would pass the assertions
    // above but fail these.
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('treeitem', { name: /Persephone/ }),
    ).toBeHidden();

    const recordsAfterSecondToggle = await readBuffer(page);

    expect(
      analyticsNamed(recordsAfterSecondToggle, 'app.route_viewed'),
    ).toHaveLength(routeViewedBeforeToggle);
    expect(
      analyticsNamed(recordsAfterSecondToggle, 'hierarchy.viewed'),
    ).toHaveLength(1);
    expect(
      analyticsNamed(recordsAfterSecondToggle, 'hierarchy.toggled'),
    ).toHaveLength(2);
  });

  test('no event in the buffer carries a password, an email, a person name or a photo URL', async ({
    page,
    baseURL,
  }) => {
    const password = 'not-a-real-password-9f2c';
    const photoUrl = 'https://example.com/photos/gurevitch.jpg';

    await installRouteMocks(page, baseURL ?? '');
    await installHierarchyUserMock(page, {
      status: 200,
      body: [
        {
          id: 1,
          firstName: 'Ronnen',
          lastName: 'Gurevitch',
          email: 'ronnen.gurevitch@example.com',
          password,
          photo: photoUrl,
        },
        {
          id: 2,
          firstName: 'Dorit',
          lastName: 'Nuhum',
          email: 'dorit.nuhum@example.com',
          managerId: 1,
          password: 'another-not-real-password',
        },
      ],
    });
    await signIn(page);
    await expect(page.getByRole('tree')).toBeVisible();

    // Ronnen is a root manager, expanded by default - toggling it
    // collapses it, which is what puts its own toggle payload (depth,
    // expanded) in the buffer alongside the load events.
    await focusTreeRow(page, /Ronnen Gurevitch/);
    await page.keyboard.press('Enter');

    const records = await readBuffer(page);
    const serialized = JSON.stringify(records);

    expect(serialized).not.toContain(password);
    expect(serialized).not.toContain('another-not-real-password');
    expect(serialized).not.toContain('ronnen.gurevitch@example.com');
    expect(serialized).not.toContain('dorit.nuhum@example.com');
    expect(serialized.toLowerCase()).not.toContain('ronnen');
    expect(serialized.toLowerCase()).not.toContain('gurevitch');
    expect(serialized.toLowerCase()).not.toContain('dorit');
    expect(serialized.toLowerCase()).not.toContain('nuhum');
    expect(serialized).not.toContain(photoUrl);
  });

  test('every hierarchy flow produces no console error or warning', async ({
    page,
    baseURL,
  }) => {
    await installRouteMocks(page, baseURL ?? '');
    await installPopulatedHierarchyMock(page);
    const { records: consoleRecords } = recordConsole(page);

    await signIn(page);
    await expect(page.getByRole('tree')).toBeVisible();

    await focusTreeRow(page, /Tal Bergman/);
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('treeitem', { name: /Persephone/ }),
    ).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('treeitem', { name: /Persephone/ }),
    ).toBeHidden();

    expect(consoleRecords).toEqual([]);
  });
});
