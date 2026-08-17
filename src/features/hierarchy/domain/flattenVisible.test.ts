import { describe, expect, it } from 'vitest';
import { testPerson } from '../testing/testPerson';
import { buildForest } from './buildForest';
import { flattenVisible } from './flattenVisible';
import { parsePersonIdentifier } from './personIdentifier';
import type { PersonIdentifier } from './personIdentifier';

describe('flattenVisible', () => {
  it("rows come out in pre-order and a collapsed node's whole subtree is absent at every depth", () => {
    const { roots } = buildForest([
      testPerson(1),
      testPerson(2, { managerId: 1 }),
      testPerson(3, { managerId: 2 }),
      testPerson(4),
    ]);

    const rows = flattenVisible(
      roots,
      new Set<PersonIdentifier>([parsePersonIdentifier(1)]),
    );

    expect(rows.map((row) => row.person.id)).toEqual([1, 2, 4]);
    expect(rows.map((row) => row.depth)).toEqual([0, 1, 0]);
  });

  it("setSize and posInSet describe the row's siblings under the same parent", () => {
    const { roots } = buildForest([
      testPerson(1),
      testPerson(2),
      testPerson(3),
      testPerson(4, { managerId: 1 }),
      testPerson(5, { managerId: 1 }),
    ]);

    const rows = flattenVisible(
      roots,
      new Set<PersonIdentifier>([parsePersonIdentifier(1)]),
    );

    const rootRows = rows.filter((row) => row.depth === 0);
    expect(rootRows.map((row) => row.setSize)).toEqual([3, 3, 3]);
    expect(rootRows.map((row) => row.posInSet)).toEqual([1, 2, 3]);

    const childRows = rows.filter((row) => row.depth === 1);
    expect(childRows.map((row) => row.setSize)).toEqual([2, 2]);
    expect(childRows.map((row) => row.posInSet)).toEqual([1, 2]);
  });

  it('isExpanded is false for every childless row whatever the expanded set contains', () => {
    const { roots } = buildForest([testPerson(1)]);

    const rows = flattenVisible(
      roots,
      new Set<PersonIdentifier>([parsePersonIdentifier(1)]),
    );

    expect(rows[0]?.isExpanded).toBe(false);
  });

  it('an expanded id naming no node or naming a childless node changes nothing', () => {
    const { roots } = buildForest([testPerson(1), testPerson(2)]);

    const baseline = flattenVisible(roots, new Set<PersonIdentifier>());
    const withNoise = flattenVisible(
      roots,
      new Set<PersonIdentifier>([
        parsePersonIdentifier(999),
        parsePersonIdentifier(2),
      ]),
    );

    expect(withNoise).toEqual(baseline);
  });

  it('flattening an empty forest returns an empty row list', () => {
    expect(flattenVisible([], new Set<PersonIdentifier>())).toEqual([]);
  });

  it('expanding a node and collapsing it again reproduces the original row list exactly', () => {
    const { roots } = buildForest([
      testPerson(1),
      testPerson(2, { managerId: 1 }),
    ]);

    const collapsed = flattenVisible(roots, new Set<PersonIdentifier>());
    flattenVisible(
      roots,
      new Set<PersonIdentifier>([parsePersonIdentifier(1)]),
    );
    const collapsedAgain = flattenVisible(roots, new Set<PersonIdentifier>());

    expect(collapsedAgain).toEqual(collapsed);
  });
});
