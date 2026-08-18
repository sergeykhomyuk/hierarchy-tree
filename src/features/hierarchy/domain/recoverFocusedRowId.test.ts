import { describe, expect, it } from 'vitest';
import { buildForest } from './buildForest';
import { flattenVisible } from './flattenVisible';
import { recoverFocusedRowId } from './recoverFocusedRowId';
import { parsePersonIdentifier } from './personIdentifier';
import type { PersonIdentifier } from './personIdentifier';
import { testPerson } from '../testing/testPerson';

describe('recoverFocusedRowId', () => {
  it('a focused id still present in the next rows is returned unchanged', () => {
    const { roots } = buildForest([testPerson(1), testPerson(2)]);
    const rows = flattenVisible(roots, new Set<PersonIdentifier>());

    expect(
      recoverFocusedRowId(rows, rows, parsePersonIdentifier(2)),
    ).toBe(2);
  });

  it('a focused id no longer present falls back to its nearest still-visible ancestor', () => {
    const { roots } = buildForest([
      testPerson(1),
      testPerson(2, { managerId: 1 }),
      testPerson(3, { managerId: 2 }),
    ]);
    const expandedRows = flattenVisible(
      roots,
      new Set<PersonIdentifier>([
        parsePersonIdentifier(1),
        parsePersonIdentifier(2),
      ]),
    );
    const collapsedRows = flattenVisible(roots, new Set<PersonIdentifier>());

    const recovered = recoverFocusedRowId(
      expandedRows,
      collapsedRows,
      parsePersonIdentifier(3),
    );

    expect(recovered).toBe(1);
  });

  it('a focused id no longer present with no surviving ancestor falls back to the first visible row', () => {
    const { roots } = buildForest([
      testPerson(1),
      testPerson(2, { managerId: 1 }),
      testPerson(3),
    ]);
    const before = flattenVisible(
      roots,
      new Set<PersonIdentifier>([parsePersonIdentifier(1)]),
    );
    // A brand-new payload rebuilds the forest with fresh objects - the
    // previously-focused person no longer exists in this tree at all, not
    // even its manager, so no ancestor walk can ever land on a survivor.
    const { roots: nextRoots } = buildForest([testPerson(3), testPerson(4)]);
    const after = flattenVisible(nextRoots, new Set<PersonIdentifier>());

    const recovered = recoverFocusedRowId(
      before,
      after,
      parsePersonIdentifier(2),
    );

    expect(recovered).toBe(3);
  });

  it('an empty next row list returns null', () => {
    const { roots } = buildForest([testPerson(1)]);
    const rows = flattenVisible(roots, new Set<PersonIdentifier>());

    expect(recoverFocusedRowId(rows, [], parsePersonIdentifier(1))).toBeNull();
  });
});
