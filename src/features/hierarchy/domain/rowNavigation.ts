import type { VisibleRow } from './flattenVisible';
import type { PersonIdentifier } from './personIdentifier';

export function findRowIndexById(
  rows: readonly VisibleRow[],
  personId: PersonIdentifier,
): number {
  return rows.findIndex((row) => row.person.id === personId);
}

// The nearest preceding row exactly one level shallower - the parent of
// the row at `index` in a pre-order visible-row list. Every ancestor of a
// visible row is itself visible (a row renders only while its manager is
// expanded), so a single backward scan for the first shallower depth
// always lands on the real parent, never a more distant ancestor.
export function parentRowIndex(
  rows: readonly VisibleRow[],
  index: number,
): number {
  const row = rows[index];
  if (row === undefined) return -1;
  const parentDepth = row.depth - 1;
  if (parentDepth < 0) return -1;
  for (let candidate = index - 1; candidate >= 0; candidate -= 1) {
    if (rows[candidate].depth === parentDepth) return candidate;
  }
  return -1;
}
