import { describe, expect, it } from 'vitest';
import { buildForest } from './buildForest';
import { flattenVisible } from './flattenVisible';
import { findRowIndexById, parentRowIndex } from './rowNavigation';
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

  it('parentRowIndex returns -1 for an out-of-range index', () => {
    const { roots } = buildForest([testPerson(1)]);
    const rows = flattenVisible(roots, new Set<PersonIdentifier>());

    expect(parentRowIndex(rows, 5)).toBe(-1);
  });
});
