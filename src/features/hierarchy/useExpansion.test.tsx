import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { useExpansion } from './useExpansion';
import { buildForest } from './domain/buildForest';
import { parsePersonIdentifier } from './domain/personIdentifier';
import type { PersonIdentifier } from './domain/personIdentifier';
import type { TreeNode } from './domain/treeNode';
import { testPerson } from './testing/testPerson';

// Sorted so the assertion does not depend on Set insertion order surviving
// a round trip through the URL and back.
function sortedIds(ids: ReadonlySet<PersonIdentifier>): string {
  return [...ids]
    .map((id) => String(id))
    .sort((left, right) => Number(left) - Number(right))
    .join(',');
}

function ExpansionHarness({ roots }: { roots: readonly TreeNode[] }) {
  const { expandedIds, toggleExpanded, expandMany } = useExpansion(roots);
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

function renderExpansion(initialPath = '/') {
  const roots = threeGenerationRoots();
  const router = createMemoryRouter(
    [{ path: '/', element: <ExpansionHarness roots={roots} /> }],
    { initialEntries: [initialPath] },
  );
  render(<RouterProvider router={router} />);
  return { router, roots };
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
});
