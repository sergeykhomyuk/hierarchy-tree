import { describe, expect, it } from 'vitest';
import { elementAt } from '@shared/utils';
import { buildForest } from './buildForest';
import { flattenVisible } from './flattenVisible';
import {
  findRowIndexById,
  firstChildRowIndex,
  nextVisibleIndex,
  parentRowIndex,
  previousVisibleIndex,
  siblingRowIndices,
} from './rowNavigation';
import { parsePersonIdentifier } from './personIdentifier';
import type { PersonIdentifier } from './personIdentifier';
import { testPerson } from '../testing/testPerson';

describe('rowNavigation', () => {
  it('findRowIndexById finds the row at its position and -1 when the id names no visible row', () => {
    const { roots } = buildForest([testPerson(1), testPerson(2)]);
    const rows = flattenVisible(roots, new Set<PersonIdentifier>());

    expect(findRowIndexById(rows, parsePersonIdentifier(2))).toBe(1);
    expect(findRowIndexById(rows, parsePersonIdentifier(999))).toBe(-1);
  });

  it('parentRowIndex finds the nearest preceding row exactly one level shallower, and -1 for a root row', () => {
    const { roots } = buildForest([
      testPerson(1),
      testPerson(2, { managerId: 1 }),
      testPerson(3, { managerId: 2 }),
      testPerson(4),
    ]);
    const rows = flattenVisible(
      roots,
      new Set<PersonIdentifier>([
        parsePersonIdentifier(1),
        parsePersonIdentifier(2),
      ]),
    );
    // rows: 1 (depth 0), 2 (depth 1), 3 (depth 2), 4 (depth 0)
    expect(parentRowIndex(rows, 0)).toBe(-1);
    expect(parentRowIndex(rows, 1)).toBe(0);
    expect(parentRowIndex(rows, 2)).toBe(1);
    expect(parentRowIndex(rows, 3)).toBe(-1);
  });

  it('parentRowIndex skips past a preceding cousin subtree to reach the real parent', () => {
    const { roots } = buildForest([
      testPerson(1),
      testPerson(2, { managerId: 1 }),
      testPerson(3, { managerId: 2 }),
      testPerson(4, { managerId: 1 }),
    ]);
    const rows = flattenVisible(
      roots,
      new Set<PersonIdentifier>([
        parsePersonIdentifier(1),
        parsePersonIdentifier(2),
      ]),
    );
    // rows: 1 (depth 0), 2 (depth 1), 3 (depth 2, 2's own child), 4
    // (depth 1, 2's sibling) - 4's parent is 1, but the backward scan
    // passes both 3 and 2 (neither at depth 0) before reaching it.
    expect(parentRowIndex(rows, 3)).toBe(0);
  });

  it('parentRowIndex returns -1 for an out-of-range index', () => {
    const { roots } = buildForest([testPerson(1)]);
    const rows = flattenVisible(roots, new Set<PersonIdentifier>());

    expect(parentRowIndex(rows, 5)).toBe(-1);
  });

  it('parentRowIndex returns -1 when the backward scan finds no shallower row at all', () => {
    // flattenVisible never produces this shape - every ancestor of a
    // visible row is itself visible, so a real row list always has one.
    // This exercises the defensive fallback directly, for a row list
    // that violates that guarantee.
    const { roots } = buildForest([testPerson(1), testPerson(2)]);
    const malformedRows = flattenVisible(
      roots,
      new Set<PersonIdentifier>(),
    ).map((row) => ({ ...row, depth: row.depth + 1 }));

    expect(parentRowIndex(malformedRows, 0)).toBe(-1);
  });

  it('nextVisibleIndex and previousVisibleIndex cross branch boundaries and stay put at the ends', () => {
    const { roots } = buildForest([
      testPerson(1),
      testPerson(2, { managerId: 1 }),
      testPerson(3),
    ]);
    const rows = flattenVisible(
      roots,
      new Set<PersonIdentifier>([parsePersonIdentifier(1)]),
    );
    // rows: 1, 2, 3 - three rows, no gaps between the branch boundaries.

    expect(nextVisibleIndex(rows, 0)).toBe(1);
    expect(nextVisibleIndex(rows, 1)).toBe(2);
    expect(nextVisibleIndex(rows, 2)).toBe(2);
    expect(previousVisibleIndex(rows, 2)).toBe(1);
    expect(previousVisibleIndex(rows, 1)).toBe(0);
    expect(previousVisibleIndex(rows, 0)).toBe(0);
  });

  it('firstChildRowIndex finds the row immediately after an expanded manager, and -1 for a collapsed manager or a non-manager', () => {
    const { roots } = buildForest([
      testPerson(1),
      testPerson(2, { managerId: 1 }),
      testPerson(3),
    ]);
    const rows = flattenVisible(
      roots,
      new Set<PersonIdentifier>([parsePersonIdentifier(1)]),
    );
    // rows: 1 (expanded manager, depth 0), 2 (its child, depth 1), 3 (childless root, depth 0)

    expect(firstChildRowIndex(rows, 0)).toBe(1);
    expect(firstChildRowIndex(rows, 2)).toBe(-1);

    const collapsedRows = flattenVisible(roots, new Set<PersonIdentifier>());
    expect(firstChildRowIndex(collapsedRows, 0)).toBe(-1);
  });

  it('firstChildRowIndex returns -1 for an expanded manager with no following row at all', () => {
    const { roots } = buildForest([
      testPerson(1),
      testPerson(2, { managerId: 1 }),
    ]);
    const rows = flattenVisible(
      roots,
      new Set<PersonIdentifier>([parsePersonIdentifier(1)]),
    );
    // Truncated to just the manager row, isExpanded still true - a shape
    // flattenVisible itself never produces (an expanded manager's child
    // always follows immediately), exercising the defensive
    // child-is-undefined check directly.
    expect(firstChildRowIndex([elementAt(rows, 0)], 0)).toBe(-1);
  });

  it('firstChildRowIndex returns -1 when the following row is not one level deeper', () => {
    const { roots } = buildForest([
      testPerson(1),
      testPerson(2, { managerId: 1 }),
      testPerson(3),
    ]);
    const rows = flattenVisible(
      roots,
      new Set<PersonIdentifier>([parsePersonIdentifier(1)]),
    );
    // The manager row directly followed by the next ROOT, not its real
    // child - another shape flattenVisible never produces on its own.
    expect(
      firstChildRowIndex([elementAt(rows, 0), elementAt(rows, 2)], 0),
    ).toBe(-1);
  });

  it('siblingRowIndices finds every row under the same parent, itself included, not rows at the same depth elsewhere', () => {
    const { roots } = buildForest([
      testPerson(1),
      testPerson(2, { managerId: 1 }),
      testPerson(3, { managerId: 1 }),
      testPerson(4),
      testPerson(5, { managerId: 4 }),
    ]);
    const rows = flattenVisible(
      roots,
      new Set<PersonIdentifier>([
        parsePersonIdentifier(1),
        parsePersonIdentifier(4),
      ]),
    );
    // rows: 1 (depth 0), 2 (depth 1), 3 (depth 1), 4 (depth 0), 5 (depth 1)

    // 2's siblings under person 1 are itself and 3 - not 5, which shares
    // depth 1 but sits under a different parent.
    expect(siblingRowIndices(rows, 1)).toEqual([1, 2]);
  });

  it('siblingRowIndices skips past a preceding cousin subtree to find the same-parent boundary', () => {
    const { roots } = buildForest([
      testPerson(1),
      testPerson(2, { managerId: 1 }),
      testPerson(3, { managerId: 2 }),
      testPerson(4, { managerId: 1 }),
    ]);
    const rows = flattenVisible(
      roots,
      new Set<PersonIdentifier>([
        parsePersonIdentifier(1),
        parsePersonIdentifier(2),
      ]),
    );
    // rows: 1 (depth 0), 2 (depth 1), 3 (depth 2, 2's own child), 4
    // (depth 1, 2's sibling) - finding 4's sibling group has to pass both
    // 3 and 2 before reaching the depth-0 boundary.
    expect(siblingRowIndices(rows, 3)).toEqual([1, 3]);
  });

  it('siblingRowIndices treats the roots as siblings of each other', () => {
    const { roots } = buildForest([
      testPerson(1),
      testPerson(2, { managerId: 1 }),
      testPerson(3),
    ]);
    const rows = flattenVisible(
      roots,
      new Set<PersonIdentifier>([parsePersonIdentifier(1)]),
    );
    // rows: 1 (depth 0), 2 (depth 1), 3 (depth 0)

    expect(siblingRowIndices(rows, 0)).toEqual([0, 2]);
  });

  it('siblingRowIndices returns just the row itself when it has no siblings', () => {
    const { roots } = buildForest([testPerson(1)]);
    const rows = flattenVisible(roots, new Set<PersonIdentifier>());

    expect(siblingRowIndices(rows, 0)).toEqual([0]);
  });

  it('siblingRowIndices returns an empty array for an out-of-range index', () => {
    const { roots } = buildForest([testPerson(1)]);
    const rows = flattenVisible(roots, new Set<PersonIdentifier>());

    expect(siblingRowIndices(rows, 5)).toEqual([]);
  });
});
