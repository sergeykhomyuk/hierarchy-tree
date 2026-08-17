import { describe, expect, it } from 'vitest';
import { testPerson } from '../testing/testPerson';
import { buildForest } from './buildForest';

describe('buildForest', () => {
  it("a person with no managerId is a root and a person whose managerId names another person is that person's child", () => {
    const manager = testPerson(1);
    const report = testPerson(2, { managerId: 1 });

    const { roots } = buildForest([manager, report]);

    expect(roots).toHaveLength(1);
    expect(roots[0]?.person).toBe(manager);
    expect(roots[0]?.children).toHaveLength(1);
    expect(roots[0]?.children[0]?.person).toBe(report);
  });

  it('roots and children appear in payload order regardless of name, email, id value or subtree size', () => {
    const rootB = testPerson(50, { firstName: 'Zeta' });
    const rootA = testPerson(2, { firstName: 'Alpha' });
    const childOfA1 = testPerson(30, { managerId: 2 });
    const childOfA2 = testPerson(10, { managerId: 2 });

    const { roots } = buildForest([rootB, rootA, childOfA1, childOfA2]);

    expect(roots.map((node) => node.person.id)).toEqual([50, 2]);
    expect(roots[1]?.children.map((node) => node.person.id)).toEqual([
      30, 10,
    ]);
  });

  it('a manager is someone with at least one direct report and the report count is direct children only', () => {
    const grandparent = testPerson(1);
    const parent = testPerson(2, { managerId: 1 });
    const child = testPerson(3, { managerId: 2 });

    const { roots, counts } = buildForest([grandparent, parent, child]);

    expect(roots[0]?.children).toHaveLength(1);
    expect(roots[0]?.children[0]?.children).toHaveLength(1);
    expect(roots[0]?.children[0]?.children[0]?.children).toHaveLength(0);
    expect(counts.managers).toBe(2);
  });

  it('an empty list produces an empty forest and a single person produces one childless root', () => {
    expect(buildForest([]).roots).toEqual([]);

    const solo = testPerson(1);
    const { roots } = buildForest([solo]);
    expect(roots).toHaveLength(1);
    expect(roots[0]?.person).toBe(solo);
    expect(roots[0]?.children).toEqual([]);
  });
});
