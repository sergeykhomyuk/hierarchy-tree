import { describe, expect, it } from 'vitest';
import { testPerson } from '../testing/testPerson';
import { buildForest } from './buildForest';
import { defaultExpansion } from './defaultExpansion';

describe('defaultExpansion', () => {
  it("the default expansion is every root plus every root's child that has children", () => {
    const { roots } = buildForest([
      testPerson(1), // root1
      testPerson(2, { managerId: 1 }), // child1a, childless
      testPerson(3, { managerId: 1 }), // child1b, has a child
      testPerson(4, { managerId: 3 }), // grandchild, too deep
      testPerson(5), // root2, childless
    ]);

    const expanded = defaultExpansion(roots);

    expect([...expanded].sort((a, b) => a - b)).toEqual([1, 3, 5]);
  });

  it('the default expansion rule holds for three roots and for thirty', () => {
    function assertRuleHolds(roots: ReturnType<typeof buildForest>['roots']) {
      const expanded = defaultExpansion(roots);
      for (const root of roots) {
        expect(expanded.has(root.person.id)).toBe(true);
        for (const child of root.children) {
          expect(expanded.has(child.person.id)).toBe(child.children.length > 0);
          for (const grandchild of child.children) {
            expect(expanded.has(grandchild.person.id)).toBe(false);
          }
        }
      }
    }

    const threeRoots = buildForest([
      testPerson(1),
      testPerson(2),
      testPerson(3),
      testPerson(4, { managerId: 1 }),
      testPerson(5, { managerId: 4 }),
    ]).roots;
    assertRuleHolds(threeRoots);

    const thirty = buildForest(
      Array.from({ length: 30 }, (_unused, index) => {
        const id = index + 1;
        // A mixed depth: ids 2-10 report to root 1; ids 11-30 report to
        // one of those, giving several three-level branches to check.
        if (id === 1) return testPerson(id);
        if (id <= 10) return testPerson(id, { managerId: 1 });
        return testPerson(id, { managerId: (id % 10) + 1 });
      }),
    ).roots;
    assertRuleHolds(thirty);
  });
});
