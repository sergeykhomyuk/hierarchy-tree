import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import type { ObservabilityFacade } from '@platform/observability';
import { useExpansion } from './useExpansion';
import { buildForest } from './domain/buildForest';
import { parsePersonIdentifier } from './domain/personIdentifier';
import type { PersonIdentifier } from './domain/personIdentifier';
import type { TreeNode } from './domain/treeNode';
import { testPerson } from './testing/testPerson';

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
  return (
    <div>
      <p>expanded: {sortedIds(expandedIds)}</p>
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
  render(<RouterProvider router={router} />);
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
});
