import { elementAt } from './elementAt';
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

export function buildForest(people: readonly Person[]): ForestBuildResult {
  const survivors: Person[] = [];
  const indexById = new Map<PersonIdentifier, number>();
  for (const person of people) {
    if (indexById.has(person.id)) continue;
    indexById.set(person.id, survivors.length);
    survivors.push(person);
  }

  const managerIndexOf: (number | undefined)[] = survivors.map((person) => {
    if (person.managerId === undefined) return undefined;
    return indexById.get(person.managerId);
  });

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
    const index = readyIndices.pop();
    if (index === undefined) break;

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
      duplicateId: 0,
      danglingManager: 0,
      selfManaged: 0,
      cycleBroken: 0,
      skippedExpansionSegment: 0,
    },
    counts: {
      people: survivors.length,
      managers,
      roots: roots.length,
    },
  };
}
