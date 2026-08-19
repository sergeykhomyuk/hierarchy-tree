import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { createFakeClock } from '@shared/testing';
import { useTreeKeyboard } from './useTreeKeyboard';
import type { UseTreeKeyboardOptions } from './useTreeKeyboard';
import { buildForest, flattenVisible, parsePersonIdentifier } from './domain';
import { testPerson } from './testing';

type HarnessProps = Omit<
  UseTreeKeyboardOptions,
  'tabbableId' | 'onFocusRow'
> & {
  initialTabbableId: UseTreeKeyboardOptions['tabbableId'];
};

// A direct unit harness for the hook's own contract - HierarchyTree.test.tsx
// already exercises every key through a real rendered tree; this harness
// wires onFocusRow straight to state instead of the imperative DOM .focus()
// call HierarchyTree uses, so it can reach the hook's own defensive guards
// (a stale or absent tabbable id) that a real tree never produces.
function Harness({
  initialTabbableId,
  rows,
  accessibleNames,
  onToggleRow,
  onExpandSiblings,
  clock,
  language,
}: HarnessProps) {
  const [tabbableId, setTabbableId] = useState(initialTabbableId);
  const onKeyDown = useTreeKeyboard({
    rows,
    accessibleNames,
    tabbableId,
    onFocusRow: setTabbableId,
    onToggleRow,
    onExpandSiblings,
    clock,
    language,
  });
  return (
    <div
      role="treeitem"
      aria-selected={false}
      data-testid="tree"
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      {tabbableId === null ? 'none' : String(tabbableId)}
    </div>
  );
}

function twoRows() {
  const roots = buildForest([
    testPerson(1),
    testPerson(2, { managerId: 1 }),
  ]).roots;
  const expandedIds = new Set([parsePersonIdentifier(1)]);
  const rows = flattenVisible(roots, expandedIds);
  const accessibleNames = rows.map(
    (row) => `${row.person.firstName} ${row.person.lastName}`,
  );
  return { rows, accessibleNames };
}

function mountTree(overrides: Partial<HarnessProps> = {}) {
  const { rows, accessibleNames } = twoRows();
  render(
    <Harness
      initialTabbableId={rows[0]?.person.id ?? null}
      rows={rows}
      accessibleNames={accessibleNames}
      onToggleRow={vi.fn()}
      onExpandSiblings={vi.fn()}
      clock={createFakeClock()}
      language="en-US"
      {...overrides}
    />,
  );
  return screen.getByTestId('tree');
}

describe('useTreeKeyboard', () => {
  it('moves focus to the next row on ArrowDown', () => {
    const tree = mountTree();
    expect(tree).toHaveTextContent('1');

    fireEvent.keyDown(tree, { key: 'ArrowDown' });
    expect(tree).toHaveTextContent('2');
  });

  it('does nothing when no row is the current tabbable one', () => {
    const onToggleRow = vi.fn();
    const tree = mountTree({ initialTabbableId: null, onToggleRow });
    expect(tree).toHaveTextContent('none');

    const notCancelled = fireEvent.keyDown(tree, { key: 'ArrowDown' });

    expect(tree).toHaveTextContent('none');
    expect(onToggleRow).not.toHaveBeenCalled();
    // preventDefault was never reached, so the event is left uncancelled.
    expect(notCancelled).toBe(true);
  });

  it('does nothing when the tabbable row is no longer in the row list', () => {
    const onToggleRow = vi.fn();
    const staleId = parsePersonIdentifier(999);
    const tree = mountTree({ initialTabbableId: staleId, onToggleRow });

    const notCancelled = fireEvent.keyDown(tree, { key: 'ArrowDown' });

    expect(tree).toHaveTextContent(String(staleId));
    expect(onToggleRow).not.toHaveBeenCalled();
    expect(notCancelled).toBe(true);
  });

  it('ignores a modifier-held key and never starts the type-ahead reset timer', () => {
    const clock = createFakeClock();
    const setTimerSpy = vi.spyOn(clock, 'setTimer');
    const tree = mountTree({ clock });

    const notCancelled = fireEvent.keyDown(tree, { key: 'a', ctrlKey: true });

    expect(notCancelled).toBe(true);
    expect(setTimerSpy).not.toHaveBeenCalled();
  });

  it('ignores a non-printable key such as Shift with no modifier held', () => {
    const clock = createFakeClock();
    const setTimerSpy = vi.spyOn(clock, 'setTimer');
    const tree = mountTree({ clock });

    const notCancelled = fireEvent.keyDown(tree, { key: 'Shift' });

    expect(notCancelled).toBe(true);
    expect(setTimerSpy).not.toHaveBeenCalled();
  });
});
