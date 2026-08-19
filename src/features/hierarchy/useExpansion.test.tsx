import { describe, expect, it, vi } from 'vitest';
import { StrictMode, useState } from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import type { ObservabilityFacade } from '@platform/observability';
import { useExpansion } from './useExpansion';
import {
  buildForest,
  parsePersonIdentifier,
  type PersonIdentifier,
  type TreeNode,
} from './domain';
import { testPerson } from './testing';

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

// Sorted so the assertion does not depend on Set insertion order surviving
// a round trip through the URL and back.
function sortedIds(ids: ReadonlySet<PersonIdentifier>): string {
  return [...ids]
    .map((id) => String(id))
    .sort((left, right) => Number(left) - Number(right))
    .join(',');
}

function ExpansionHarness({
  roots,
  observability,
}: {
  roots: readonly TreeNode[];
  observability: ObservabilityFacade;
}) {
  const { expandedIds, toggleExpanded, expandMany } = useExpansion(
    roots,
    observability,
  );
  // Counts how many times expandMany's and toggleExpanded's OWN identities
  // changed across renders - the render-count assertion invariant 91
  // demands, applied to the callbacks themselves rather than to a rendered
  // row (HierarchyTree.test.tsx already covers rows; this covers the hook
  // that feeds them, with the real useSearchParams wiring rather than a
  // stubbed onToggle/onExpandMany). State adjusted during render (React's
  // documented pattern), not a ref, which the render output would then
  // read straight out of - eslint's react-hooks/refs rule (and React
  // Compiler) forbid that as an anti-pattern.
  // useState(expandMany) directly would be misread as a lazy initializer -
  // useState calls a function argument to compute the initial value rather
  // than storing the function itself - so the initial value is wrapped in
  // its own thunk to store expandMany AS a value.
  const [previousExpandMany, setPreviousExpandMany] = useState(
    () => expandMany,
  );
  const [expandManyChangeCount, setExpandManyChangeCount] = useState(0);
  if (previousExpandMany !== expandMany) {
    setPreviousExpandMany(() => expandMany);
    setExpandManyChangeCount((count) => count + 1);
  }
  const [previousToggleExpanded, setPreviousToggleExpanded] = useState(
    () => toggleExpanded,
  );
  const [toggleExpandedChangeCount, setToggleExpandedChangeCount] = useState(0);
  if (previousToggleExpanded !== toggleExpanded) {
    setPreviousToggleExpanded(() => toggleExpanded);
    setToggleExpandedChangeCount((count) => count + 1);
  }
  return (
    <div>
      <p>expanded: {sortedIds(expandedIds)}</p>
      <p>expandMany identity changes: {expandManyChangeCount}</p>
      <p>toggleExpanded identity changes: {toggleExpandedChangeCount}</p>
      <button
        type="button"
        onClick={() => toggleExpanded(parsePersonIdentifier(1))}
      >
        toggle 1
      </button>
      <button
        type="button"
        onClick={() => toggleExpanded(parsePersonIdentifier(2))}
      >
        toggle 2
      </button>
      <button
        type="button"
        onClick={() =>
          expandMany([parsePersonIdentifier(1), parsePersonIdentifier(2)])
        }
      >
        expand 1 and 2
      </button>
    </div>
  );
}

// A root managing a manager managing an individual contributor - the
// smallest shape with two distinct manager ids to toggle and a third,
// non-manager id that parseExpansion would reject from the URL.
function threeGenerationRoots(): readonly TreeNode[] {
  return buildForest([
    testPerson(1),
    testPerson(2, { managerId: 1 }),
    testPerson(3, { managerId: 2 }),
  ]).roots;
}

function renderExpansion(
  initialPath = '/',
  roots: readonly TreeNode[] = threeGenerationRoots(),
  { strict = false }: { strict?: boolean } = {},
) {
  const observability = createSpyObservability();
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: (
          <ExpansionHarness roots={roots} observability={observability} />
        ),
      },
    ],
    { initialEntries: [initialPath] },
  );
  const tree = <RouterProvider router={router} />;
  render(strict ? <StrictMode>{tree}</StrictMode> : tree);
  return { router, roots, observability };
}

describe('useExpansion', () => {
  it('a URL carrying expanded renders exactly those branches open and ignores the default expansion', () => {
    renderExpansion('/?expanded=2');

    // The default expansion for this fixture is {1, 2} - a URL naming only
    // 2 must render {2}, not {1, 2}, proving the URL replaces the default
    // rather than layering on top of it.
    expect(screen.getByText('expanded: 2')).toBeInTheDocument();
  });

  it('Back undoes the last toggle and Forward redoes it', async () => {
    const user = userEvent.setup();
    const { router } = renderExpansion();

    expect(screen.getByText('expanded: 1,2')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'toggle 1' }));
    expect(screen.getByText('expanded: 2')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'toggle 2' }));
    expect(screen.getByText('expanded:')).toBeInTheDocument();

    await act(async () => {
      await router.navigate(-1);
    });
    expect(screen.getByText('expanded: 2')).toBeInTheDocument();

    await act(async () => {
      await router.navigate(1);
    });
    expect(screen.getByText('expanded:')).toBeInTheDocument();
  });

  it('Back past the first toggle returns to the default expansion', async () => {
    const user = userEvent.setup();
    const { router } = renderExpansion();

    await user.click(screen.getByRole('button', { name: 'toggle 1' }));
    expect(screen.getByText('expanded: 2')).toBeInTheDocument();

    await act(async () => {
      await router.navigate(-1);
    });
    expect(screen.getByText('expanded: 1,2')).toBeInTheDocument();
  });

  it('a toggle preserves every other search parameter', async () => {
    const user = userEvent.setup();
    const { router } = renderExpansion('/?from=%2Fsomewhere&flag=1');

    await user.click(screen.getByRole('button', { name: 'toggle 1' }));

    const params = new URLSearchParams(router.state.location.search);
    expect(params.get('from')).toBe('/somewhere');
    expect(params.get('flag')).toBe('1');
    expect(params.get('expanded')).toBe('2');
  });

  it('expandMany opens several branches in one history entry', async () => {
    const user = userEvent.setup();
    const { router } = renderExpansion('/?expanded=');

    expect(screen.getByText('expanded:')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'expand 1 and 2' }));
    expect(screen.getByText('expanded: 1,2')).toBeInTheDocument();

    // One Back undoes the whole action, not one id at a time - proof it
    // was a single history entry rather than two toggles in sequence.
    await act(async () => {
      await router.navigate(-1);
    });
    expect(screen.getByText('expanded:')).toBeInTheDocument();
  });

  it('expandMany that would open nothing writes no history entry', async () => {
    const user = userEvent.setup();
    const { router } = renderExpansion();

    expect(screen.getByText('expanded: 1,2')).toBeInTheDocument();
    const entryCountBefore = router.state.location.key;

    await user.click(screen.getByRole('button', { name: 'expand 1 and 2' }));

    expect(screen.getByText('expanded: 1,2')).toBeInTheDocument();
    expect(router.state.location.key).toBe(entryCountBefore);
  });

  it('expansion writes nothing to local storage, session storage or a cookie', async () => {
    const user = userEvent.setup();
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const cookieBefore = document.cookie;

    renderExpansion();
    await user.click(screen.getByRole('button', { name: 'toggle 1' }));
    await user.click(screen.getByRole('button', { name: 'toggle 2' }));

    expect(setItemSpy).not.toHaveBeenCalled();
    expect(document.cookie).toBe(cookieBefore);
  });

  it('reports skipped segments once per parse', () => {
    const { observability } = renderExpansion('/?expanded=abc,3,2217873750');

    // segment "abc" (not a safe positive integer) and "3" (a real person
    // who is not a manager) are both skipped; "2217873750" names nobody
    // and is skipped too - three skips from one parse, one report
    // (invariant 121).
    expect(observability.logger.warn).toHaveBeenCalledTimes(1);
    expect(observability.logger.warn).toHaveBeenCalledWith(
      'hierarchy.expansion_segments_skipped',
      { skipped: 3 },
    );
  });

  it('reports nothing when no segment is skipped', () => {
    const { observability } = renderExpansion('/?expanded=2');

    expect(observability.logger.warn).not.toHaveBeenCalled();
  });

  it('still reports skipped segments only once under StrictMode', () => {
    // bootstrap.ts wraps the real app in StrictMode, which deliberately
    // double-invokes an effect (mount, cleanup, mount again) with the
    // identical closure to surface side-effect bugs - the dependency array
    // alone cannot tell that apart from a real second parse, since nothing
    // in it changes between the two invocations either.
    const { observability } = renderExpansion('/?expanded=abc', undefined, {
      strict: true,
    });

    expect(observability.logger.warn).toHaveBeenCalledTimes(1);
  });

  it('reports again on a genuine second visit to the same stale link, not only the StrictMode duplicate', async () => {
    const { observability, router } = renderExpansion('/?expanded=abc');

    expect(observability.logger.warn).toHaveBeenCalledTimes(1);

    // A real intervening navigation - not the same render StrictMode
    // re-invokes - so the guard that dedupes StrictMode's duplicate must
    // not also dedupe this.
    await act(async () => {
      await router.navigate('/?expanded=2');
    });
    expect(observability.logger.warn).toHaveBeenCalledTimes(1);

    await act(async () => {
      await router.navigate('/?expanded=abc');
    });
    expect(observability.logger.warn).toHaveBeenCalledTimes(2);
  });

  it('a childless root never reaches the URL even though it is part of the default expansion', async () => {
    const user = userEvent.setup();
    // Two roots: 1 is a manager (has child 2), 5 is a leaf with no
    // children - defaultExpansion includes both (invariant 87/88), but
    // invariant 116 restricts the URL to manager ids only.
    const roots = buildForest([
      testPerson(1),
      testPerson(2, { managerId: 1 }),
      testPerson(5),
    ]).roots;
    const { router } = renderExpansion('/', roots);

    expect(screen.getByText('expanded: 1,5')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'toggle 1' }));

    const params = new URLSearchParams(router.state.location.search);
    expect(params.get('expanded')).toBe('');
  });

  it("expandMany's own identity survives a real toggle, not only an unrelated render (invariant 91)", async () => {
    const user = userEvent.setup();
    renderExpansion();

    expect(
      screen.getByText('expandMany identity changes: 0'),
    ).toBeInTheDocument();

    // toggleExpanded, not expandMany itself - the point is that TOGGLING
    // (which changes the URL, which is what previously made expandMany's
    // own dependency array recompute a fresh expandedIds Set on every
    // real toggle, not only on an unrelated render) leaves expandMany's
    // identity untouched.
    await user.click(screen.getByRole('button', { name: 'toggle 1' }));
    await user.click(screen.getByRole('button', { name: 'toggle 2' }));

    expect(
      screen.getByText('expandMany identity changes: 0'),
    ).toBeInTheDocument();
  });
});
