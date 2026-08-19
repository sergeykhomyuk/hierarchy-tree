import { elementAt } from '@shared/utils';
import type { ForestAnomalies } from './forestAnomaly';
import type { Person } from './person';
import type { PersonIdentifier } from './personIdentifier';
import type { TreeNode } from './treeNode';

export type ForestSummaryCounts = {
  readonly people: number;
  readonly managers: number;
  readonly roots: number;
};

export type ForestBuildResult = {
  readonly roots: readonly TreeNode[];
  readonly anomalies: ForestAnomalies;
  readonly counts: ForestSummaryCounts;
};

const VisitState = {
  Unvisited: 0,
  Visiting: 1,
  Visited: 2,
} as const;
type VisitState = (typeof VisitState)[keyof typeof VisitState];

type MutableTreeNode = {
  readonly person: Person;
  readonly children: TreeNode[];
};

export function buildForest(people: readonly Person[]): ForestBuildResult {
  const survivors: Person[] = [];
  const indexById = new Map<PersonIdentifier, number>();
  let duplicateId = 0;
  for (const person of people) {
    if (indexById.has(person.id)) {
      duplicateId += 1;
      continue;
    }
    indexById.set(person.id, survivors.length);
    survivors.push(person);
  }

  let danglingManager = 0;
  let selfManaged = 0;
  const managerIndexOf: (number | undefined)[] = survivors.map((person) => {
    if (person.managerId === undefined) return undefined;
    if (person.managerId === person.id) {
      selfManaged += 1;
      return undefined;
    }
    const managerIndex = indexById.get(person.managerId);
    if (managerIndex === undefined) {
      danglingManager += 1;
      return undefined;
    }
    return managerIndex;
  });

  // Iterative state walk (invariant 14: must terminate on every input,
  // including a ring of everyone) rather than recursion. A cycle is found
  // when the walk reaches a node still being visited on the current path; the
  // earliest ring member in payload order becomes the root (invariant 12).
  let cycleBroken = 0;
  const visitStates: VisitState[] = survivors.map(() => VisitState.Unvisited);
  for (let startIndex = 0; startIndex < survivors.length; startIndex += 1) {
    if (elementAt(visitStates, startIndex) !== VisitState.Unvisited) continue;

    const path: number[] = [];
    let current: number | undefined = startIndex;
    while (
      current !== undefined &&
      elementAt(visitStates, current) === VisitState.Unvisited
    ) {
      visitStates[current] = VisitState.Visiting;
      path.push(current);
      current = managerIndexOf[current];
    }

    if (
      current !== undefined &&
      elementAt(visitStates, current) === VisitState.Visiting
    ) {
      const cycleStart = path.indexOf(current);
      const cycleIndices = path.slice(cycleStart);
      const earliestIndex = Math.min(...cycleIndices);
      managerIndexOf[earliestIndex] = undefined;
      cycleBroken += 1;
    }
    for (const visitedIndex of path) {
      visitStates[visitedIndex] = VisitState.Visited;
    }
  }

  const nodes: MutableTreeNode[] = survivors.map((person) => ({
    person,
    children: [],
  }));
  const roots: TreeNode[] = [];
  let managers = 0;
  for (let index = 0; index < survivors.length; index += 1) {
    const managerIndex = managerIndexOf[index];
    const node = elementAt(nodes, index);
    if (managerIndex === undefined) {
      roots.push(node);
    } else {
      const managerChildren = elementAt(nodes, managerIndex).children;
      if (managerChildren.length === 0) managers += 1;
      managerChildren.push(node);
    }
  }

  return {
    roots,
    anomalies: {
      duplicateId,
      danglingManager,
      selfManaged,
      cycleBroken,
    },
    counts: {
      people: survivors.length,
      managers,
      roots: roots.length,
    },
  };
}
