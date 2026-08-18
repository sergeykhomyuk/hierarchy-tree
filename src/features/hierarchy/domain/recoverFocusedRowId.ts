import { findRowIndexById, parentRowIndex } from './rowNavigation';
import type { VisibleRow } from './flattenVisible';
import type { PersonIdentifier } from './personIdentifier';

// Walks the OLD row list's ancestor chain from where the vanished id used
// to sit, returning the nearest ancestor that still exists in the NEW row
// list - falling back to the new list's first row when no ancestor
// survived either (invariants 132, 143, 144).
export function recoverFocusedRowId(
  previousRows: readonly VisibleRow[],
  nextRows: readonly VisibleRow[],
  focusedId: PersonIdentifier,
): PersonIdentifier | null {
  if (nextRows.some((row) => row.person.id === focusedId)) {
    return focusedId;
  }

  const nextIds = new Set(nextRows.map((row) => row.person.id));
  let index = findRowIndexById(previousRows, focusedId);
  while (index !== -1) {
    index = parentRowIndex(previousRows, index);
    if (index === -1) break;
    const candidateId = previousRows[index].person.id;
    if (nextIds.has(candidateId)) return candidateId;
  }

  return nextRows[0]?.person.id ?? null;
}
