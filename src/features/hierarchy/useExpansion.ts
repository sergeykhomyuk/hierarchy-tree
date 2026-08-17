import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { defaultExpansion } from './domain/defaultExpansion';
import { formatExpansion, parseExpansion } from './domain/expansionParameter';
import type { PersonIdentifier } from './domain/personIdentifier';
import type { TreeNode } from './domain/treeNode';

const EXPANDED_PARAM = 'expanded';

export type UseExpansionResult = {
  readonly expandedIds: ReadonlySet<PersonIdentifier>;
  readonly toggleExpanded: (personId: PersonIdentifier) => void;
};

function readExpandedIds(
  searchParams: URLSearchParams,
  roots: readonly TreeNode[],
): ReadonlySet<PersonIdentifier> {
  const { expanded } = parseExpansion(searchParams.get(EXPANDED_PARAM), roots);
  return expanded ?? defaultExpansion(roots);
}

// Wraps useSearchParams rather than owning state of its own - the expanded
// parameter, and only that parameter, is the single source of what's open
// (invariants 116, 126). setSearchParams pushes a history entry by default,
// which is invariant 122, and starting the next value from the current
// URLSearchParams rather than a fresh one leaves every other parameter -
// phase 2's from included - untouched (invariant 127).
export function useExpansion(roots: readonly TreeNode[]): UseExpansionResult {
  const [searchParams, setSearchParams] = useSearchParams();
  const expandedIds = readExpandedIds(searchParams, roots);

  const toggleExpanded = useCallback(
    (personId: PersonIdentifier) => {
      setSearchParams((current) => {
        const next = new Set(readExpandedIds(current, roots));
        if (next.has(personId)) {
          next.delete(personId);
        } else {
          next.add(personId);
        }
        const nextParams = new URLSearchParams(current);
        nextParams.set(EXPANDED_PARAM, formatExpansion(next));
        return nextParams;
      });
    },
    [roots, setSearchParams],
  );

  return { expandedIds, toggleExpanded };
}
