import type { PersonIdentifier } from './personIdentifier';
import type { TreeNode } from './treeNode';

export function defaultExpansion(
  roots: readonly TreeNode[],
): ReadonlySet<PersonIdentifier> {
  const expanded = new Set<PersonIdentifier>();
  for (const root of roots) {
    expanded.add(root.person.id);
    for (const child of root.children) {
      if (child.children.length > 0) {
        expanded.add(child.person.id);
      }
    }
  }
  return expanded;
}
