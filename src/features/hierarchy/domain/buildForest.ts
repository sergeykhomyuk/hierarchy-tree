import { elementAt } from './elementAt';
import { popElement } from './popElement';
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

const VisitColor = {
  White: 0,
  Grey: 1,
  Black: 2,
} as const;
type VisitColor = (typeof VisitColor)[keyof typeof VisitColor];

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

  // Iterative white/grey/black walk (invariant 14: must terminate on every
  // input, including a ring of everyone) rather than recursion. A cycle is
  // found when the walk reaches a grey node still on the current path; the
  // earliest ring member in payload order becomes the root (invariant 12).
  let cycleBroken = 0;
  const color: VisitColor[] = survivors.map(() => VisitColor.White);
  for (let startIndex = 0; startIndex < survivors.length; startIndex += 1) {
    if (elementAt(color, startIndex) !== VisitColor.White) continue;

    const path: number[] = [];
    let current: number | undefined = startIndex;
    while (
      current !== undefined &&
      elementAt(color, current) === VisitColor.White
    ) {
      color[current] = VisitColor.Grey;
      path.push(current);
      current = managerIndexOf[current];
    }

    if (
      current !== undefined &&
      elementAt(color, current) === VisitColor.Grey
    ) {
      const cycleStart = path.indexOf(current);
      const cycleIndices = path.slice(cycleStart);
      const earliestIndex = Math.min(...cycleIndices);
      managerIndexOf[earliestIndex] = undefined;
      cycleBroken += 1;
    }
    for (const visitedIndex of path) color[visitedIndex] = VisitColor.Black;
  }

  const childrenIndicesByIndex: number[][] = survivors.map(() => []);
  const rootIndices: number[] = [];
  for (let index = 0; index < survivors.length; index += 1) {
    const managerIndex = managerIndexOf[index];
    if (managerIndex === undefined) {
      rootIndices.push(index);
    } else {
      elementAt(childrenIndicesByIndex, managerIndex).push(index);
    }
  }

  const nodes: (TreeNode | undefined)[] = survivors.map(() => undefined);
  const remainingChildrenToBuild = childrenIndicesByIndex.map(
    (children) => children.length,
  );
  const readyIndices: number[] = [];
  for (let index = 0; index < survivors.length; index += 1) {
    if (elementAt(remainingChildrenToBuild, index) === 0) {
      readyIndices.push(index);
    }
  }
  while (readyIndices.length > 0) {
    const index = popElement(readyIndices);

    const children = elementAt(childrenIndicesByIndex, index)
      .map((childIndex) => nodes[childIndex])
      .filter((node): node is TreeNode => node !== undefined);
    nodes[index] = { person: elementAt(survivors, index), children };

    const managerIndex = managerIndexOf[index];
    if (managerIndex !== undefined) {
      const remaining = elementAt(remainingChildrenToBuild, managerIndex) - 1;
      remainingChildrenToBuild[managerIndex] = remaining;
      if (remaining === 0) {
        readyIndices.push(managerIndex);
      }
    }
  }

  const roots = rootIndices
    .map((index) => nodes[index])
    .filter((node): node is TreeNode => node !== undefined);
  const managers = childrenIndicesByIndex.filter(
    (children) => children.length > 0,
  ).length;

  return {
    roots,
    anomalies: {
      duplicateId,
      danglingManager,
      selfManaged,
      cycleBroken,
      skippedExpansionSegment: 0,
    },
    counts: {
      people: survivors.length,
      managers,
      roots: roots.length,
    },
  };
}
