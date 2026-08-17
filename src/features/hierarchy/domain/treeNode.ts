import type { Person } from './person';

export type TreeNode = {
  readonly person: Person;
  readonly children: readonly TreeNode[];
};
