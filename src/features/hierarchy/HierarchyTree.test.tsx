import { useCallback, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import {
  createInternationalization,
  Locale,
} from '@platform/internationalization';
import type { ObservabilityFacade } from '@platform/observability';
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
}: {
  roots: readonly TreeNode[];
  initialExpandedIds: ReadonlySet<PersonIdentifier>;
  observability: ObservabilityFacade;
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

  return (
    <HierarchyTree
      roots={roots}
      expandedIds={expandedIds}
      observability={observability}
      onToggle={handleToggle}
    />
  );
}

async function renderStatefulTree(props: {
  roots: readonly TreeNode[];
  initialExpandedIds: ReadonlySet<PersonIdentifier>;
}) {
  const observability = createSpyObservability();
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
      />
    </I18nextProvider>,
  );
  return { ...view, observability };
}

function rowToggle(rowName: string): HTMLElement {
  return within(screen.getByRole('treeitem', { name: rowName })).getByRole(
    'button',
    { hidden: true },
  );
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
  props: Omit<HierarchyTreeProps, 'observability' | 'onToggle'> & {
    observability?: ObservabilityFacade;
    onToggle?: (personId: PersonIdentifier) => void;
  },
) {
  const observability = props.observability ?? createSpyObservability();
  const onToggle = props.onToggle ?? vi.fn();
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
      />
    </I18nextProvider>,
  );
  return { ...view, observability, onToggle, i18n };
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
    const { rerender, container, observability, onToggle, i18n } =
      await renderTree({
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
            onToggle={onToggle}
          />
        </I18nextProvider>,
      );
      rerender(
        <I18nextProvider i18n={i18n}>
          <HierarchyTree
            roots={roots}
            expandedIds={new Set([managerId])}
            observability={observability}
            onToggle={onToggle}
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
          onToggle={onToggle}
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
      const rows = screen.getAllByRole('treeitem');
      fireEvent.focus(rows[1]);

      expect(screen.getAllByRole('treeitem').map((row) => row.tabIndex)).toEqual(
        [-1, 0],
      );
    });

    it('collapsing the branch containing the tabbable row leaves exactly one still-rendered row tabbable', async () => {
      const { roots } = buildForest([
        testPerson(1),
        testPerson(2, { managerId: 1 }),
      ]);
      const rootId = parsePersonIdentifier(1);
      const user = userEvent.setup();

      await renderStatefulTree({ roots, initialExpandedIds: new Set([rootId]) });
      fireEvent.focus(screen.getByRole('treeitem', { name: 'First2 Last2' }));

      await user.click(rowToggle('First1 Last1'));

      const rows = screen.getAllByRole('treeitem');
      expect(rows).toHaveLength(1);
      expect(rows[0].tabIndex).toBe(0);
    });
  });
});
