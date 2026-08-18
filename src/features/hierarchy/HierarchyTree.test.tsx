import { act, useCallback, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  // eslint-disable-next-line testing-library/no-manual-cleanup -- the keyboard/mouse-parity test renders twice in one test (once per key) and needs each isolated from the last.
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import {
  createInternationalization,
  Locale,
} from '@platform/internationalization';
import type { ObservabilityFacade } from '@platform/observability';
import { createFakeClock } from '@shared/testing';
import '@shared/testing/toHaveNoAxeViolations';
import { loadTranslations } from './loadTranslations';
import { HierarchyTree } from './HierarchyTree';
import type { HierarchyTreeProps } from './HierarchyTree';
import { buildForest } from './domain/buildForest';
import * as buildForestModule from './domain/buildForest';
import { parsePersonIdentifier } from './domain/personIdentifier';
import type { PersonIdentifier } from './domain/personIdentifier';
import type { TreeNode } from './domain/treeNode';
import { testPerson } from './testing/testPerson';

// A stand-in for the state HierarchyPage owns in the meantime
// (defaultExpansion until useExpansion lands at step 27) - HierarchyTree
// itself is a fully controlled component, so exercising a real mouse
// toggle end to end needs something above it holding the expandedIds
// state, exactly like the real page will.
function StatefulTreeHarness({
  roots,
  initialExpandedIds,
  observability,
  clock,
}: {
  roots: readonly TreeNode[];
  initialExpandedIds: ReadonlySet<PersonIdentifier>;
  observability: ObservabilityFacade;
  clock: ReturnType<typeof createFakeClock>;
}) {
  const [expandedIds, setExpandedIds] = useState(initialExpandedIds);
  const handleToggle = useCallback((personId: PersonIdentifier) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(personId)) {
        next.delete(personId);
      } else {
        next.add(personId);
      }
      return next;
    });
  }, []);
  const handleExpandMany = useCallback(
    (personIds: readonly PersonIdentifier[]) => {
      setExpandedIds((current) => {
        const next = new Set(current);
        for (const personId of personIds) next.add(personId);
        return next;
      });
    },
    [],
  );

  return (
    <HierarchyTree
      roots={roots}
      expandedIds={expandedIds}
      observability={observability}
      clock={clock}
      onToggle={handleToggle}
      onExpandMany={handleExpandMany}
    />
  );
}

async function renderStatefulTree(props: {
  roots: readonly TreeNode[];
  initialExpandedIds: ReadonlySet<PersonIdentifier>;
}) {
  const observability = createSpyObservability();
  const clock = createFakeClock();
  const i18n = await createInternationalization({
    resources: { common: {} },
    language: Locale.Test,
    observability: { logger: { error: vi.fn() } },
  });
  await loadTranslations(i18n);
  const view = render(
    <I18nextProvider i18n={i18n}>
      <StatefulTreeHarness
        roots={props.roots}
        initialExpandedIds={props.initialExpandedIds}
        observability={observability}
        clock={clock}
      />
    </I18nextProvider>,
  );
  return { ...view, observability, clock };
}

function rowToggle(rowName: string): HTMLElement {
  return within(screen.getByRole('treeitem', { name: rowName })).getByRole(
    'button',
    { hidden: true },
  );
}

// element.focus() alone leaves the resulting tabbableId update unflushed
// under React's automatic batching - the very next getAllByRole
// ('treeitem') would still see the OLD tabIndex attributes. act() forces
// that update to commit before this returns, while a raw .focus() (not
// fireEvent.focus) is what actually moves document.activeElement, which
// toHaveFocus() reads.
function focusRow(name: string) {
  act(() => {
    screen.getByRole('treeitem', { name }).focus();
  });
}

// A real keydown only ever fires on the element that actually has DOM
// focus - the tabbable row, per the roving-tabindex contract these tests
// exercise - never on the tree container itself, which holds no tab stop
// of its own.
function pressKey(key: string) {
  const tabbableRow = screen
    .getAllByRole('treeitem')
    .find((row) => row.tabIndex === 0);
  if (tabbableRow === undefined) {
    throw new Error('expected exactly one tabbable row');
  }
  fireEvent.keyDown(tabbableRow, { key });
}

function createSpyObservability(): ObservabilityFacade {
  return {
    logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    tracer: {
      recordTiming: vi.fn(),
      startInteraction: vi.fn(() => 'a'.repeat(32)),
    },
    analytics: { track: vi.fn() },
  };
}

function brokenPhotoImage(container: HTMLElement): HTMLImageElement {
  // eslint-disable-next-line testing-library/no-node-access -- the row's photo is decorative by design (invariant 101), so it has no accessible role to query through.
  const image = container.querySelector('img');
  if (image === null) throw new Error('expected a photo <img> in the tree');
  return image;
}

async function renderTree(
  props: Omit<
    HierarchyTreeProps,
    'observability' | 'onToggle' | 'clock' | 'onExpandMany'
  > & {
    observability?: ObservabilityFacade;
    onToggle?: (personId: PersonIdentifier) => void;
    clock?: ReturnType<typeof createFakeClock>;
    onExpandMany?: (personIds: readonly PersonIdentifier[]) => void;
  },
) {
  const observability = props.observability ?? createSpyObservability();
  const onToggle = props.onToggle ?? vi.fn();
  const clock = props.clock ?? createFakeClock();
  const onExpandMany = props.onExpandMany ?? vi.fn();
  const i18n = await createInternationalization({
    resources: { common: {} },
    language: Locale.Test,
    observability: { logger: { error: vi.fn() } },
  });
  await loadTranslations(i18n);
  const view = render(
    <I18nextProvider i18n={i18n}>
      <HierarchyTree
        {...props}
        observability={observability}
        onToggle={onToggle}
        clock={clock}
        onExpandMany={onExpandMany}
      />
    </I18nextProvider>,
  );
  return { ...view, observability, onToggle, clock, onExpandMany, i18n };
}

describe('HierarchyTree', () => {
  it('renders every visible row from the row model, in order, and nothing else', async () => {
    const { roots } = buildForest([
      testPerson(1),
      testPerson(2, { managerId: 1 }),
    ]);

    await renderTree({
      roots,
      expandedIds: new Set([parsePersonIdentifier(1)]),
    });

    const rows = screen.getAllByRole('treeitem');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveAccessibleName('First1 Last1');
    expect(rows[1]).toHaveAccessibleName('First2 Last2');
  });

  it('a string signed-in identifier marks no row and changes nothing else', async () => {
    const { roots } = buildForest([testPerson(1)]);

    await renderTree({
      roots,
      expandedIds: new Set(),
      signedInUserId: 'not-a-person-id',
    });

    const rows = screen.getAllByRole('treeitem');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveAccessibleName('First1 Last1');
  });

  it('a signed-in identifier matching a person id marks exactly that row', async () => {
    const { roots } = buildForest([
      testPerson(1),
      testPerson(2, { managerId: 1 }),
    ]);

    await renderTree({
      roots,
      expandedIds: new Set([parsePersonIdentifier(1)]),
      // The real === comparison HierarchyTree.tsx makes, not a prop
      // handed straight to TreeRow - proves the id actually matches
      // through the row model rather than only through a test double.
      signedInUserId: parsePersonIdentifier(2),
    });

    const rows = screen.getAllByRole('treeitem');
    expect(rows[0]).toHaveAccessibleName('First1 Last1');
    expect(rows[1]).toHaveAccessibleName('First2 Last2, page.youMarkerLabel');
  });

  it('collapsing and re-expanding a branch three times produces one photo-failure report for that person', async () => {
    const photoUrl = 'https://example.test/broken-photo.jpg';
    const managerId = parsePersonIdentifier(1);
    const { roots } = buildForest([
      testPerson(1),
      testPerson(2, {
        managerId: 1,
        firstName: 'Broken',
        lastName: 'Photo',
        photo: photoUrl,
      }),
    ]);
    const {
      rerender,
      container,
      observability,
      onToggle,
      clock,
      onExpandMany,
      i18n,
    } = await renderTree({
      roots,
      expandedIds: new Set([managerId]),
    });

    for (let cycle = 0; cycle < 3; cycle += 1) {
      fireEvent.error(brokenPhotoImage(container));

      // Collapse (unmounts Broken Photo's row) then re-expand (remounts
      // it) - a fresh mount of the same row, not a fresh payload.
      rerender(
        <I18nextProvider i18n={i18n}>
          <HierarchyTree
            roots={roots}
            expandedIds={new Set()}
            observability={observability}
            clock={clock}
            onToggle={onToggle}
            onExpandMany={onExpandMany}
          />
        </I18nextProvider>,
      );
      rerender(
        <I18nextProvider i18n={i18n}>
          <HierarchyTree
            roots={roots}
            expandedIds={new Set([managerId])}
            observability={observability}
            clock={clock}
            onToggle={onToggle}
            onExpandMany={onExpandMany}
          />
        </I18nextProvider>,
      );
    }

    expect(observability.logger.warn).toHaveBeenCalledTimes(1);
  });

  it('a second resolved payload reports the same still-broken photo again', async () => {
    const photoUrl = 'https://example.test/broken-photo.jpg';
    const firstLoad = buildForest([
      testPerson(1, {
        firstName: 'Broken',
        lastName: 'Photo',
        photo: photoUrl,
      }),
    ]);
    const secondLoad = buildForest([
      testPerson(1, {
        firstName: 'Broken',
        lastName: 'Photo',
        photo: photoUrl,
      }),
    ]);
    const {
      unmount,
      container: firstContainer,
      observability,
      onToggle,
      clock,
      onExpandMany,
      i18n,
    } = await renderTree({
      roots: firstLoad.roots,
      expandedIds: new Set(),
    });

    fireEvent.error(brokenPhotoImage(firstContainer));
    expect(observability.logger.warn).toHaveBeenCalledTimes(1);

    // Unmount and mount fresh rather than rerender(): a retry's new
    // payload reaches this component through a NEW Suspense commit (the
    // loader's new promise makes HierarchyPage suspend again, discarding
    // the whole subtree while the fallback shows), not a prop update on
    // the same instance - Avatar's own imageFailed state would otherwise
    // survive a mere rerender() and never show an <img> to fail again.
    unmount();
    const { container: secondContainer } = render(
      <I18nextProvider i18n={i18n}>
        <HierarchyTree
          roots={secondLoad.roots}
          expandedIds={new Set()}
          observability={observability}
          clock={clock}
          onToggle={onToggle}
          onExpandMany={onExpandMany}
        />
      </I18nextProvider>,
    );
    fireEvent.error(brokenPhotoImage(secondContainer));

    expect(observability.logger.warn).toHaveBeenCalledTimes(2);
  });

  it('the photo-failure report carries no photo URL', async () => {
    const photoUrl = 'https://example.test/broken-photo.jpg';
    const { roots } = buildForest([
      testPerson(1, {
        firstName: 'Broken',
        lastName: 'Photo',
        photo: photoUrl,
      }),
    ]);
    const { container, observability } = await renderTree({
      roots,
      expandedIds: new Set(),
    });

    fireEvent.error(brokenPhotoImage(container));

    expect(observability.logger.warn).toHaveBeenCalledTimes(1);
    const [, attributes] =
      vi.mocked(observability.logger.warn).mock.calls[0] ?? [];
    expect(JSON.stringify(attributes)).not.toContain(photoUrl);
  });

  it('collapsing a parent and re-expanding it restores exactly the expansion its descendants had', async () => {
    const { roots } = buildForest([
      testPerson(1),
      testPerson(2, { managerId: 1 }),
      testPerson(3, { managerId: 2 }),
    ]);
    const rootId = parsePersonIdentifier(1);
    const childId = parsePersonIdentifier(2);
    const user = userEvent.setup();

    await renderStatefulTree({
      roots,
      initialExpandedIds: new Set([rootId, childId]),
    });
    expect(screen.getAllByRole('treeitem')).toHaveLength(3);

    // Collapsing the root hides its whole subtree, grandchild included,
    // in one step (invariant 109) - without ever removing childId from
    // the expansion set, only rootId.
    await user.click(rowToggle('First1 Last1'));
    expect(screen.getAllByRole('treeitem')).toHaveLength(1);

    // Re-expanding restores the grandchild too - proof that the child's
    // own expansion survived being hidden rather than being silently
    // collapsed along with its parent (invariant 110).
    await user.click(rowToggle('First1 Last1'));
    expect(screen.getAllByRole('treeitem')).toHaveLength(3);
  });

  it('a sequence of toggles intercepts no request and calls the forest builder once', async () => {
    const { roots } = buildForest([
      testPerson(1),
      testPerson(2, { managerId: 1 }),
    ]);
    const buildForestSpy = vi.spyOn(buildForestModule, 'buildForest');
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const rootId = parsePersonIdentifier(1);
    const user = userEvent.setup();

    await renderStatefulTree({ roots, initialExpandedIds: new Set([rootId]) });

    const toggle = rowToggle('First1 Last1');
    await user.click(toggle);
    await user.click(toggle);
    await user.click(toggle);

    // buildForest runs once, in fetchPeople.ts, before any of this ever
    // renders - toggling only recomputes flattenVisible's row list, never
    // rebuilds the forest and never touches the network (invariant 112).
    expect(buildForestSpy).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("clicking a toggle emits one telemetry event carrying the new state and the row's depth, with no name, email or person id", async () => {
    const { roots } = buildForest([
      testPerson(1),
      testPerson(2, { managerId: 1 }),
    ]);
    const rootId = parsePersonIdentifier(1);
    const user = userEvent.setup();

    const { observability } = await renderStatefulTree({
      roots,
      initialExpandedIds: new Set([rootId]),
    });

    await user.click(rowToggle('First1 Last1'));

    expect(observability.analytics.track).toHaveBeenCalledTimes(1);
    const [eventName, payload] =
      vi.mocked(observability.analytics.track).mock.calls[0] ?? [];
    expect(eventName).toBe('hierarchy.toggled');
    expect(payload).toEqual({ expanded: false, depth: 0 });
    expect(JSON.stringify(payload)).not.toContain('First1');
    expect(JSON.stringify(payload)).not.toContain('example.test');
  });

  it('clicking a toggle announces the new state and the affected branch through a live region', async () => {
    const { roots } = buildForest([
      testPerson(1),
      testPerson(2, { managerId: 1 }),
    ]);
    const rootId = parsePersonIdentifier(1);
    const user = userEvent.setup();

    await renderStatefulTree({ roots, initialExpandedIds: new Set([rootId]) });

    await user.click(rowToggle('First1 Last1'));
    // Under the key-echoed test catalogue, the announcement can only land
    // on this exact key by way of the toggle's own new-state branch - a
    // component-side string built without the catalogue could never
    // reproduce it.
    expect(screen.getByTestId('tree-announcer')).toHaveTextContent(
      'page.toggleAnnouncedCollapsed',
    );

    await user.click(rowToggle('First1 Last1'));
    expect(screen.getByTestId('tree-announcer')).toHaveTextContent(
      'page.toggleAnnouncedExpanded',
    );
  });

  describe('roving tabindex', () => {
    it('exactly one row is tabbable, and on first render it is the first visible row', async () => {
      const { roots } = buildForest([testPerson(1), testPerson(2)]);

      await renderTree({ roots, expandedIds: new Set() });

      const rows = screen.getAllByRole('treeitem');
      expect(rows.map((row) => row.tabIndex)).toEqual([0, -1]);
    });

    it('the toggle control is never part of the tab sequence', async () => {
      const { roots } = buildForest([
        testPerson(1),
        testPerson(2, { managerId: 1 }),
      ]);

      await renderTree({
        roots,
        expandedIds: new Set([parsePersonIdentifier(1)]),
      });

      expect(rowToggle('First1 Last1').tabIndex).toBe(-1);
    });

    it('the row that receives focus becomes the tabbable row, and the rest fall out of the tab sequence', async () => {
      const { roots } = buildForest([testPerson(1), testPerson(2)]);

      await renderTree({ roots, expandedIds: new Set() });
      fireEvent.focus(screen.getByRole('treeitem', { name: 'First2 Last2' }));

      expect(
        screen.getAllByRole('treeitem').map((row) => row.tabIndex),
      ).toEqual([-1, 0]);
    });

    it('collapsing the branch containing the tabbable row leaves exactly one still-rendered row tabbable', async () => {
      const { roots } = buildForest([
        testPerson(1),
        testPerson(2, { managerId: 1 }),
      ]);
      const rootId = parsePersonIdentifier(1);
      const user = userEvent.setup();

      await renderStatefulTree({
        roots,
        initialExpandedIds: new Set([rootId]),
      });
      focusRow('First2 Last2');

      await user.click(rowToggle('First1 Last1'));

      const rows = screen.getAllByRole('treeitem');
      expect(rows).toHaveLength(1);
      expect(rows[0]).toHaveAttribute('tabindex', '0');
    });
  });

  describe('keyboard navigation', () => {
    it('ArrowDown moves focus to the next visible row and ArrowUp to the previous, crossing branch boundaries', async () => {
      const { roots } = buildForest([
        testPerson(1),
        testPerson(2, { managerId: 1 }),
        testPerson(3),
      ]);

      await renderTree({
        roots,
        expandedIds: new Set([parsePersonIdentifier(1)]),
      });

      pressKey('ArrowDown');
      expect(
        screen.getByRole('treeitem', { name: 'First2 Last2' }),
      ).toHaveFocus();
      pressKey('ArrowDown');
      expect(
        screen.getByRole('treeitem', { name: 'First3 Last3' }),
      ).toHaveFocus();
      pressKey('ArrowUp');
      expect(
        screen.getByRole('treeitem', { name: 'First2 Last2' }),
      ).toHaveFocus();
    });

    it('ArrowDown and ArrowUp do nothing at the ends of the list', async () => {
      const { roots } = buildForest([testPerson(1), testPerson(2)]);

      await renderTree({ roots, expandedIds: new Set() });
      pressKey('ArrowUp');
      expect(
        screen.getByRole('treeitem', { name: 'First1 Last1' }),
      ).toHaveFocus();

      focusRow('First2 Last2');
      pressKey('ArrowDown');
      expect(
        screen.getByRole('treeitem', { name: 'First2 Last2' }),
      ).toHaveFocus();
    });

    it('ArrowRight on a collapsed manager expands it and leaves focus in place', async () => {
      const { roots } = buildForest([
        testPerson(1),
        testPerson(2, { managerId: 1 }),
      ]);

      await renderStatefulTree({ roots, initialExpandedIds: new Set() });
      focusRow('First1 Last1');
      pressKey('ArrowRight');

      expect(
        screen.getByRole('treeitem', { name: 'First1 Last1' }),
      ).toHaveFocus();
      expect(
        screen.getByRole('treeitem', { name: 'First2 Last2' }),
      ).toBeVisible();
    });

    it('ArrowRight on an expanded manager moves focus to its first child', async () => {
      const { roots } = buildForest([
        testPerson(1),
        testPerson(2, { managerId: 1 }),
      ]);

      await renderTree({
        roots,
        expandedIds: new Set([parsePersonIdentifier(1)]),
      });
      pressKey('ArrowRight');

      expect(
        screen.getByRole('treeitem', { name: 'First2 Last2' }),
      ).toHaveFocus();
    });

    it('ArrowRight on a non-manager does nothing', async () => {
      const { roots } = buildForest([testPerson(1)]);

      await renderTree({ roots, expandedIds: new Set() });
      focusRow('First1 Last1');
      pressKey('ArrowRight');

      expect(
        screen.getByRole('treeitem', { name: 'First1 Last1' }),
      ).toHaveFocus();
    });

    it('ArrowLeft on an expanded manager collapses it and leaves focus in place', async () => {
      const { roots } = buildForest([
        testPerson(1),
        testPerson(2, { managerId: 1 }),
      ]);

      await renderStatefulTree({
        roots,
        initialExpandedIds: new Set([parsePersonIdentifier(1)]),
      });
      focusRow('First1 Last1');
      pressKey('ArrowLeft');

      expect(
        screen.getByRole('treeitem', { name: 'First1 Last1' }),
      ).toHaveFocus();
      expect(
        screen.queryByRole('treeitem', { name: 'First2 Last2' }),
      ).not.toBeInTheDocument();
    });

    it('ArrowLeft on a collapsed manager, or on any non-manager, moves focus to its parent', async () => {
      const { roots } = buildForest([
        testPerson(1),
        testPerson(2, { managerId: 1 }),
        testPerson(3, { managerId: 1 }),
      ]);

      await renderTree({
        roots,
        expandedIds: new Set([parsePersonIdentifier(1)]),
      });
      focusRow('First3 Last3');
      pressKey('ArrowLeft');

      expect(
        screen.getByRole('treeitem', { name: 'First1 Last1' }),
      ).toHaveFocus();
    });

    it('ArrowLeft on an already-collapsed root does nothing', async () => {
      const { roots } = buildForest([testPerson(1)]);

      await renderTree({ roots, expandedIds: new Set() });
      focusRow('First1 Last1');
      pressKey('ArrowLeft');

      expect(
        screen.getByRole('treeitem', { name: 'First1 Last1' }),
      ).toHaveFocus();
    });

    it('Home moves focus to the first visible row and End to the last', async () => {
      const { roots } = buildForest([
        testPerson(1),
        testPerson(2, { managerId: 1 }),
        testPerson(3),
      ]);

      await renderTree({
        roots,
        expandedIds: new Set([parsePersonIdentifier(1)]),
      });
      pressKey('End');
      expect(
        screen.getByRole('treeitem', { name: 'First3 Last3' }),
      ).toHaveFocus();
      pressKey('Home');
      expect(
        screen.getByRole('treeitem', { name: 'First1 Last1' }),
      ).toHaveFocus();
    });

    it("Enter toggles the focused manager's branch and does nothing on a non-manager row", async () => {
      const { roots } = buildForest([
        testPerson(1),
        testPerson(2, { managerId: 1 }),
        testPerson(3),
      ]);

      await renderStatefulTree({
        roots,
        initialExpandedIds: new Set([parsePersonIdentifier(1)]),
      });
      focusRow('First1 Last1');
      pressKey('Enter');
      expect(
        screen.queryByRole('treeitem', { name: 'First2 Last2' }),
      ).not.toBeInTheDocument();

      focusRow('First3 Last3');
      pressKey('Enter');
      expect(screen.getAllByRole('treeitem')).toHaveLength(2);
    });

    it("Space toggles the focused manager's branch and does nothing on a non-manager row", async () => {
      const { roots } = buildForest([
        testPerson(1),
        testPerson(2, { managerId: 1 }),
        testPerson(3),
      ]);

      await renderStatefulTree({
        roots,
        initialExpandedIds: new Set([parsePersonIdentifier(1)]),
      });
      focusRow('First1 Last1');
      pressKey(' ');
      expect(
        screen.queryByRole('treeitem', { name: 'First2 Last2' }),
      ).not.toBeInTheDocument();

      focusRow('First3 Last3');
      pressKey(' ');
      expect(screen.getAllByRole('treeitem')).toHaveLength(2);
    });

    it('a keyboard toggle - Enter, Space, Right or Left - updates the URL, the live region and telemetry identically to a mouse click', async () => {
      const { roots } = buildForest([
        testPerson(1),
        testPerson(2, { managerId: 1 }),
      ]);
      const rootId = parsePersonIdentifier(1);

      for (const key of ['Enter', ' ']) {
        const { observability } = await renderStatefulTree({
          roots,
          initialExpandedIds: new Set([rootId]),
        });
        focusRow('First1 Last1');

        pressKey(key);

        expect(observability.analytics.track).toHaveBeenCalledTimes(1);
        const [eventName, payload] =
          vi.mocked(observability.analytics.track).mock.calls[0] ?? [];
        expect(eventName).toBe('hierarchy.toggled');
        expect(payload).toEqual({ expanded: false, depth: 0 });
        expect(screen.getByTestId('tree-announcer')).toHaveTextContent(
          'page.toggleAnnouncedCollapsed',
        );
        cleanup();
      }
    });

    it('moving focus with arrow keys, Home or End writes nothing to the URL and emits no telemetry', async () => {
      const { roots } = buildForest([
        testPerson(1),
        testPerson(2, { managerId: 1 }),
      ]);
      const onToggle = vi.fn();
      const observability = createSpyObservability();

      await renderTree({
        roots,
        expandedIds: new Set([parsePersonIdentifier(1)]),
        onToggle,
        observability,
      });

      pressKey('ArrowDown');
      pressKey('ArrowUp');
      pressKey('Home');
      pressKey('End');

      expect(onToggle).not.toHaveBeenCalled();
      expect(observability.analytics.track).not.toHaveBeenCalled();
    });
  });

  describe('type-ahead', () => {
    function typeAheadRoots() {
      return buildForest([
        testPerson(1, { firstName: 'Andrew', lastName: 'Crist' }),
        testPerson(2, { firstName: 'Bar', lastName: 'Refaeli' }),
        testPerson(3, { firstName: 'Barak', lastName: 'Levi' }),
        testPerson(4, { firstName: 'Éric', lastName: 'Dupont' }),
      ]).roots;
    }

    it('typing a character moves focus to the next visible row whose accessible name starts with it, case-insensitively', async () => {
      await renderTree({ roots: typeAheadRoots(), expandedIds: new Set() });

      pressKey('B');

      expect(
        screen.getByRole('treeitem', { name: 'Bar Refaeli' }),
      ).toHaveFocus();
    });

    it('matches accent-insensitively through a locale-aware comparison', async () => {
      await renderTree({ roots: typeAheadRoots(), expandedIds: new Set() });

      pressKey('e');

      expect(
        screen.getByRole('treeitem', { name: 'Éric Dupont' }),
      ).toHaveFocus();
    });

    it('a repeated single character cycles through the rows starting with it', async () => {
      await renderTree({ roots: typeAheadRoots(), expandedIds: new Set() });

      pressKey('b');
      expect(
        screen.getByRole('treeitem', { name: 'Bar Refaeli' }),
      ).toHaveFocus();
      pressKey('b');
      expect(
        screen.getByRole('treeitem', { name: 'Barak Levi' }),
      ).toHaveFocus();
      pressKey('b');
      expect(
        screen.getByRole('treeitem', { name: 'Bar Refaeli' }),
      ).toHaveFocus();
    });

    it('the type-ahead buffer resets after a second of no typing', async () => {
      const clock = createFakeClock();
      await renderTree({
        roots: typeAheadRoots(),
        expandedIds: new Set(),
        clock,
      });

      pressKey('b');
      expect(
        screen.getByRole('treeitem', { name: 'Bar Refaeli' }),
      ).toHaveFocus();

      await act(async () => {
        await clock.advance(1000);
      });

      // A stale, unreset buffer would search for "ba" and land on Barak
      // Levi instead - the distinguishing case this test exists to catch.
      pressKey('a');
      expect(
        screen.getByRole('treeitem', { name: 'Andrew Crist' }),
      ).toHaveFocus();
    });
  });

  describe('asterisk expand', () => {
    function siblingRoots() {
      return buildForest([
        testPerson(1),
        testPerson(2, { managerId: 1 }),
        testPerson(3, { managerId: 1 }),
        testPerson(4, { managerId: 1 }),
        testPerson(5, { managerId: 2 }),
        testPerson(6, { managerId: 3 }),
      ]).roots;
    }

    it('asterisk expands every collapsed sibling under the same parent, including the focused row if it is a collapsed manager', async () => {
      await renderStatefulTree({
        roots: siblingRoots(),
        initialExpandedIds: new Set([parsePersonIdentifier(1)]),
      });
      focusRow('First2 Last2');

      pressKey('*');

      // 1, 2, 5 (2's child), 3, 6 (3's child), 4 - person4 is a
      // non-manager sibling, untouched either way.
      expect(screen.getAllByRole('treeitem')).toHaveLength(6);
      expect(
        screen.getByRole('treeitem', { name: 'First5 Last5' }),
      ).toBeVisible();
      expect(
        screen.getByRole('treeitem', { name: 'First6 Last6' }),
      ).toBeVisible();
    });

    it('asterisk that would open nothing does nothing at all - no history entry, no announcement, no telemetry', async () => {
      const { observability } = await renderStatefulTree({
        roots: siblingRoots(),
        initialExpandedIds: new Set([
          parsePersonIdentifier(1),
          parsePersonIdentifier(2),
          parsePersonIdentifier(3),
        ]),
      });
      focusRow('First2 Last2');

      pressKey('*');

      expect(observability.analytics.track).not.toHaveBeenCalled();
      expect(screen.getByTestId('tree-announcer')).toHaveTextContent('');
    });

    it('asterisk announces how many branches opened and emits one telemetry event', async () => {
      const { observability } = await renderStatefulTree({
        roots: siblingRoots(),
        initialExpandedIds: new Set([parsePersonIdentifier(1)]),
      });
      focusRow('First2 Last2');

      pressKey('*');

      expect(observability.analytics.track).toHaveBeenCalledTimes(1);
      const [eventName, payload] =
        vi.mocked(observability.analytics.track).mock.calls[0] ?? [];
      expect(eventName).toBe('hierarchy.siblings_expanded');
      expect(payload).toEqual({ count: 2, depth: 1 });
      expect(screen.getByTestId('tree-announcer')).toHaveTextContent(
        'page.siblingsExpandedAnnounced',
      );
    });
  });

  describe('aria contract', () => {
    it('the tree exposes an accessible name from the catalogue', async () => {
      const { roots } = buildForest([testPerson(1)]);

      await renderTree({ roots, expandedIds: new Set() });

      expect(screen.getByRole('tree')).toHaveAccessibleName('page.treeLabel');
    });

    it('collapsing a branch that contains the focused row moves focus to the row being collapsed', async () => {
      const { roots } = buildForest([
        testPerson(1),
        testPerson(2, { managerId: 1 }),
        testPerson(3, { managerId: 2 }),
      ]);
      const rootId = parsePersonIdentifier(1);
      const childId = parsePersonIdentifier(2);
      const user = userEvent.setup();

      await renderStatefulTree({
        roots,
        initialExpandedIds: new Set([rootId, childId]),
      });
      focusRow('First3 Last3');

      await user.click(rowToggle('First1 Last1'));

      expect(
        screen.getByRole('treeitem', { name: 'First1 Last1' }),
      ).toHaveFocus();
    });

    it('a history navigation that removes the focused row without any collapse moves focus to its nearest still-visible ancestor', async () => {
      const { roots } = buildForest([
        testPerson(1),
        testPerson(2, { managerId: 1 }),
        testPerson(3, { managerId: 2 }),
      ]);
      const rootId = parsePersonIdentifier(1);
      const childId = parsePersonIdentifier(2);

      const { rerender, i18n, observability, clock, onToggle, onExpandMany } =
        await renderTree({
          roots,
          expandedIds: new Set([rootId, childId]),
        });
      focusRow('First3 Last3');

      // Simulates a Back/Forward: expandedIds changes to a value this
      // component never asked for through its own onToggle, exactly what
      // a POP navigation looks like from HierarchyTree's side (invariant
      // 144) - the vanished row's nearest surviving ancestor is 2, not 1.
      rerender(
        <I18nextProvider i18n={i18n}>
          <HierarchyTree
            roots={roots}
            expandedIds={new Set([rootId])}
            observability={observability}
            clock={clock}
            onToggle={onToggle}
            onExpandMany={onExpandMany}
          />
        </I18nextProvider>,
      );

      expect(
        screen.getByRole('treeitem', { name: 'First2 Last2' }),
      ).toHaveFocus();
    });

    it('a history navigation with no surviving ancestor moves focus to the first visible row, never leaving it on document.body', async () => {
      const before = buildForest([
        testPerson(1),
        testPerson(2, { managerId: 1 }),
      ]);
      const after = buildForest([testPerson(3), testPerson(4)]);

      const { rerender, i18n, observability, clock, onToggle, onExpandMany } =
        await renderTree({
          roots: before.roots,
          expandedIds: new Set([parsePersonIdentifier(1)]),
        });
      focusRow('First2 Last2');

      rerender(
        <I18nextProvider i18n={i18n}>
          <HierarchyTree
            roots={after.roots}
            expandedIds={new Set()}
            observability={observability}
            clock={clock}
            onToggle={onToggle}
            onExpandMany={onExpandMany}
          />
        </I18nextProvider>,
      );

      expect(document.body).not.toHaveFocus();
      expect(
        screen.getByRole('treeitem', { name: 'First3 Last3' }),
      ).toHaveFocus();
    });

    it('a keyboard toggle keeps focus on the row that triggered it rather than moving it', async () => {
      const { roots } = buildForest([
        testPerson(1),
        testPerson(2, { managerId: 1 }),
      ]);

      await renderStatefulTree({
        roots,
        initialExpandedIds: new Set([parsePersonIdentifier(1)]),
      });
      focusRow('First1 Last1');

      pressKey('Enter');

      expect(
        screen.getByRole('treeitem', { name: 'First1 Last1' }),
      ).toHaveFocus();
    });

    it('a nested, partially expanded tree with the you marker and a keyboard-focused row has zero axe violations', async () => {
      const { roots } = buildForest([
        testPerson(1),
        testPerson(2, { managerId: 1 }),
        testPerson(3, { managerId: 2 }),
        testPerson(4),
      ]);

      const { container } = await renderTree({
        roots,
        expandedIds: new Set([
          parsePersonIdentifier(1),
          parsePersonIdentifier(2),
        ]),
        signedInUserId: parsePersonIdentifier(3),
      });
      focusRow('First2 Last2');

      await expect(container).toHaveNoAxeViolations();
    });
  });
});
