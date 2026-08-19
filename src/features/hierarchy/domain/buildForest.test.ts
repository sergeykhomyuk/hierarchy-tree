import { describe, expect, it } from 'vitest';
import { testPerson } from '../testing/testPerson';
import { buildForest } from './buildForest';
import type { Person } from './person';

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
    expect(roots[1]?.children.map((node) => node.person.id)).toEqual([30, 10]);
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

  it('a dangling manager reference makes a root and is counted, never dropped', () => {
    const orphan = testPerson(1, { managerId: 999 });

    const { roots, anomalies } = buildForest([orphan]);

    expect(roots).toHaveLength(1);
    expect(roots[0]?.person).toBe(orphan);
    expect(anomalies.danglingManager).toBe(1);
  });

  it('a self-managing person is a root and does not appear as their own child', () => {
    const selfManager = testPerson(1, { managerId: 1 });

    const { roots, anomalies } = buildForest([selfManager]);

    expect(roots).toHaveLength(1);
    expect(roots[0]?.person).toBe(selfManager);
    expect(roots[0]?.children).toEqual([]);
    expect(anomalies.selfManaged).toBe(1);
  });

  it('a ring is broken at its earliest member and every other manager edge survives', () => {
    const first = testPerson(1, { managerId: 3 });
    const second = testPerson(2, { managerId: 1 });
    const third = testPerson(3, { managerId: 2 });

    const { roots, anomalies } = buildForest([first, second, third]);

    expect(roots).toHaveLength(1);
    expect(roots[0]?.person).toBe(first);
    expect(roots[0]?.children).toHaveLength(1);
    expect(roots[0]?.children[0]?.person).toBe(second);
    expect(roots[0]?.children[0]?.children).toHaveLength(1);
    expect(roots[0]?.children[0]?.children[0]?.person).toBe(third);
    expect(anomalies.cycleBroken).toBe(1);
  });

  it('building the same list twice produces an identical forest', () => {
    const people = [
      testPerson(1),
      testPerson(2, { managerId: 1 }),
      testPerson(3, { managerId: 999 }),
    ];

    expect(buildForest(people)).toEqual(buildForest(people));
  });

  it('a ring of two, a ring of three and a ring of everyone all terminate', () => {
    const ringOfTwo = [
      testPerson(1, { managerId: 2 }),
      testPerson(2, { managerId: 1 }),
    ];
    const ringOfThree = [
      testPerson(1, { managerId: 2 }),
      testPerson(2, { managerId: 3 }),
      testPerson(3, { managerId: 1 }),
    ];
    const ringOfEveryone = Array.from({ length: 8 }, (_unused, index) =>
      testPerson(index + 1, {
        managerId: ((index + 1) % 8) + 1,
      }),
    );

    expect(buildForest(ringOfTwo).roots).toHaveLength(1);
    expect(buildForest(ringOfThree).roots).toHaveLength(1);
    expect(buildForest(ringOfEveryone).roots).toHaveLength(1);
  });

  it('the first valid occurrence of a duplicate id wins and children attach to the survivor', () => {
    const real = testPerson(1, { firstName: 'Real' });
    const impostor = testPerson(1, { firstName: 'Impostor' });
    const child = testPerson(2, { managerId: 1 });

    const { roots, anomalies, counts } = buildForest([real, impostor, child]);

    expect(roots).toHaveLength(1);
    expect(roots[0]?.person).toBe(real);
    expect(roots[0]?.children).toHaveLength(1);
    expect(roots[0]?.children[0]?.person).toBe(child);
    expect(anomalies.duplicateId).toBe(1);
    expect(counts.people).toBe(2);
  });

  it('buildForest mutates neither the array nor the person objects handed to it', () => {
    const input = Object.freeze([
      Object.freeze(testPerson(1)),
      Object.freeze(testPerson(2, { managerId: 1 })),
      Object.freeze(testPerson(3, { managerId: 999 })),
    ]);

    expect(() => buildForest(input)).not.toThrow();
  });

  it('buildForest visits each person a bounded number of times as the input grows', () => {
    function chainOf(length: number): Person[] {
      return Array.from({ length }, (_unused, index) =>
        testPerson(index + 1, index === 0 ? {} : { managerId: index }),
      );
    }

    function withReadCounter(person: Person, onRead: () => void): Person {
      const { managerId, photo } = person;
      return {
        get id() {
          onRead();
          return person.id;
        },
        get firstName() {
          onRead();
          return person.firstName;
        },
        get lastName() {
          onRead();
          return person.lastName;
        },
        get email() {
          onRead();
          return person.email;
        },
        ...(managerId !== undefined
          ? {
              get managerId() {
                onRead();
                return managerId;
              },
            }
          : {}),
        ...(photo !== undefined
          ? {
              get photo() {
                onRead();
                return photo;
              },
            }
          : {}),
      };
    }

    function countPropertyReads(people: readonly Person[]): number {
      let reads = 0;
      const instrumented = people.map((person) =>
        withReadCounter(person, () => {
          reads += 1;
        }),
      );
      buildForest(instrumented);
      return reads;
    }

    const small = countPropertyReads(chainOf(20));
    const large = countPropertyReads(chainOf(80));

    // A quadratic implementation shows roughly 16x growth for a 4x input;
    // a linear one stays close to 4x. 10x leaves headroom for constant
    // overhead while still catching quadratic behavior.
    expect(large / small).toBeLessThan(10);
  });
});
