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
    if (rows[candidate]?.depth === parentDepth) return candidate;
  }
  return -1;
}

// Inert at the ends (invariant 133) - both return the same index rather
// than -1, so a caller can always focus rows[nextVisibleIndex(...)]
// unconditionally without a bounds check of its own.
export function nextVisibleIndex(
  rows: readonly VisibleRow[],
  index: number,
): number {
  return index + 1 < rows.length ? index + 1 : index;
}

// Takes rows only for signature symmetry with nextVisibleIndex, so both
// are safe to call the same way at a call site - the previous index never
// depends on the row count.
export function previousVisibleIndex(
  _rows: readonly VisibleRow[],
  index: number,
): number {
  return index > 0 ? index - 1 : index;
}

// The row immediately after an EXPANDED manager, in pre-order, is always
// its first child - -1 for a collapsed manager (nothing to descend into)
// or a non-manager (invariant 134's "Right on a non-manager does
// nothing").
export function firstChildRowIndex(
  rows: readonly VisibleRow[],
  index: number,
): number {
  const row = rows[index];
  if (row === undefined || !row.isExpanded) return -1;
  const child = rows[index + 1];
  return child !== undefined && child.depth === row.depth + 1 ? index + 1 : -1;
}
