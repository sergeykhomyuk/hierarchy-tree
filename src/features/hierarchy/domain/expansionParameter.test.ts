import { describe, expect, it } from 'vitest';
import { testPerson } from '../testing/testPerson';
import { buildForest } from './buildForest';
import { formatExpansion, parseExpansion } from './expansionParameter';
import { parsePersonIdentifier } from './personIdentifier';

function fixtureRoots() {
  return buildForest([
    testPerson(1),
    testPerson(2, { managerId: 1 }), // manager
    testPerson(3, { managerId: 2 }), // childless
  ]).roots;
}

describe('parseExpansion', () => {
  it('an absent parameter and a present but empty parameter give different results', () => {
    const roots = fixtureRoots();

    expect(parseExpansion(null, roots)).toEqual({
      expanded: null,
      skipped: 0,
    });
    expect(parseExpansion('', roots)).toEqual({
      expanded: new Set(),
      skipped: 0,
    });
  });

  it('a bad segment never affects a good one', () => {
    const roots = fixtureRoots();

    const { expanded, skipped } = parseExpansion('abc,1', roots);

    expect(expanded).toEqual(new Set([parsePersonIdentifier(1)]));
    expect(skipped).toBe(1);
  });

  it('signs, decimals, exponents and unsafe integers are skipped', () => {
    const roots = fixtureRoots();

    const { expanded, skipped } = parseExpansion(
      '+1,1.5,1e2,-1,99999999999999999999999',
      roots,
    );

    expect(expanded).toEqual(new Set());
    expect(skipped).toBe(5);
  });

  it('an id naming no person or naming a non-manager is skipped', () => {
    const roots = fixtureRoots();

    const { expanded, skipped } = parseExpansion('999,3', roots);

    expect(expanded).toEqual(new Set());
    expect(skipped).toBe(2);
  });

  it('duplicates are honoured once and the skipped segments are counted', () => {
    const roots = fixtureRoots();

    const { expanded, skipped } = parseExpansion(' 1 ,1,abc,1', roots);

    expect(expanded).toEqual(new Set([parsePersonIdentifier(1)]));
    expect(skipped).toBe(1);
  });
});

describe('formatExpansion', () => {
  it('joins ids with commas and round-trips through parseExpansion', () => {
    const roots = fixtureRoots();
    const ids = new Set([parsePersonIdentifier(1), parsePersonIdentifier(2)]);

    const formatted = formatExpansion(ids);

    expect(parseExpansion(formatted, roots)).toEqual({
      expanded: ids,
      skipped: 0,
    });
  });
});
