import { parsePersonIdentifier } from './personIdentifier';
import { popElement } from './popElement';
import type { PersonIdentifier } from './personIdentifier';
import type { TreeNode } from './treeNode';

export type ParsedExpansion = {
  // null means "absent" - the caller falls back to the default expansion.
  // An empty (but non-null) set means "present but empty" - every branch
  // closed - which the default expansion cannot otherwise express.
  readonly expanded: ReadonlySet<PersonIdentifier> | null;
  readonly skipped: number;
};

const SAFE_POSITIVE_INTEGER_SEGMENT = /^[0-9]+$/;

function collectManagerIds(
  roots: readonly TreeNode[],
): ReadonlySet<PersonIdentifier> {
  const managerIds = new Set<PersonIdentifier>();
  const stack: TreeNode[] = [...roots];
  while (stack.length > 0) {
    const node = popElement(stack);
    if (node.children.length > 0) {
      managerIds.add(node.person.id);
    }
    stack.push(...node.children);
  }
  return managerIds;
}

export function parseExpansion(
  raw: string | null,
  roots: readonly TreeNode[],
): ParsedExpansion {
  if (raw === null) {
    return { expanded: null, skipped: 0 };
  }

  const managerIds = collectManagerIds(roots);
  const expanded = new Set<PersonIdentifier>();
  let skipped = 0;

  for (const rawSegment of raw.split(',')) {
    const segment = rawSegment.trim();
    if (segment.length === 0) continue;

    if (!SAFE_POSITIVE_INTEGER_SEGMENT.test(segment)) {
      skipped += 1;
      continue;
    }

    let personId: PersonIdentifier;
    try {
      personId = parsePersonIdentifier(Number(segment));
    } catch {
      skipped += 1;
      continue;
    }

    if (!managerIds.has(personId)) {
      skipped += 1;
      continue;
    }

    expanded.add(personId);
  }

  return { expanded, skipped };
}

export function formatExpansion(ids: ReadonlySet<PersonIdentifier>): string {
  return [...ids].join(',');
}
