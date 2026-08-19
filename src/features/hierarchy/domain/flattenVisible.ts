import { elementAt, popElement } from '@shared/utils';
import type { Person } from './person';
import type { PersonIdentifier } from './personIdentifier';
import type { TreeNode } from './treeNode';

export type VisibleRow = {
  readonly person: Person;
  readonly depth: number;
  readonly hasChildren: boolean;
  readonly isExpanded: boolean;
  readonly setSize: number;
  readonly posInSet: number;
  readonly reportCount: number;
};

type StackEntry = {
  readonly node: TreeNode;
  readonly depth: number;
  readonly setSize: number;
  readonly posInSet: number;
};

// Turn the tree into a flat list of visible rows, in pre-order, with depth and position information.
export function flattenVisible(
  roots: readonly TreeNode[],
  expandedIds: ReadonlySet<PersonIdentifier>,
): readonly VisibleRow[] {
  const rows: VisibleRow[] = [];
  const stack: StackEntry[] = [];

  // Push in reverse so the stack (LIFO) pops in payload order, giving a
  // pre-order walk without recursion.
  for (let index = roots.length - 1; index >= 0; index -= 1) {
    stack.push({
      node: elementAt(roots, index),
      depth: 0,
      setSize: roots.length,
      posInSet: index + 1,
    });
  }

  while (stack.length > 0) {
    const entry = popElement(stack);
    const { node, depth, setSize, posInSet } = entry;
    const hasChildren = node.children.length > 0;
    const isExpanded = hasChildren && expandedIds.has(node.person.id);

    rows.push({
      person: node.person,
      depth,
      hasChildren,
      isExpanded,
      setSize,
      posInSet,
      reportCount: node.children.length,
    });

    if (isExpanded) {
      const childCount = node.children.length;
      for (let index = childCount - 1; index >= 0; index -= 1) {
        stack.push({
          node: elementAt(node.children, index),
          depth: depth + 1,
          setSize: childCount,
          posInSet: index + 1,
        });
      }
    }
  }

  return rows;
}
