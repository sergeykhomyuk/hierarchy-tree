import { useCallback } from 'react';
import type { KeyboardEvent } from 'react';
import {
  findRowIndexById,
  firstChildRowIndex,
  nextVisibleIndex,
  parentRowIndex,
  previousVisibleIndex,
} from './domain/rowNavigation';
import type { VisibleRow } from './domain/flattenVisible';
import type { PersonIdentifier } from './domain/personIdentifier';

export type UseTreeKeyboardOptions = {
  rows: readonly VisibleRow[];
  tabbableId: PersonIdentifier | null;
  // Imperative DOM focus - the ONLY thing that moves the roving tab stop
  // (TreeRow's own onFocus handler updates tabbableId in response, so
  // this hook never sets that state directly).
  onFocusRow: (personId: PersonIdentifier) => void;
  // The same callback the mouse toggle uses (invariant 142) - Right on a
  // collapsed manager and Left on an expanded one route through it too,
  // so a keyboard-driven expand/collapse updates the URL, the live
  // region and telemetry identically to a click.
  onToggleRow: (personId: PersonIdentifier) => void;
};

// Arrow, Home and End movement (invariants 133-136). Enter/Space toggling
// and type-ahead are later M4 steps layered onto this same handler.
export function useTreeKeyboard({
  rows,
  tabbableId,
  onFocusRow,
  onToggleRow,
}: UseTreeKeyboardOptions) {
  return useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (tabbableId === null) return;
      const index = findRowIndexById(rows, tabbableId);
      if (index === -1) return;
      const row = rows[index];

      switch (event.key) {
        case 'ArrowDown': {
          event.preventDefault();
          onFocusRow(rows[nextVisibleIndex(rows, index)].person.id);
          return;
        }
        case 'ArrowUp': {
          event.preventDefault();
          onFocusRow(rows[previousVisibleIndex(rows, index)].person.id);
          return;
        }
        case 'ArrowRight': {
          if (!row.hasChildren) return;
          event.preventDefault();
          if (!row.isExpanded) {
            onToggleRow(row.person.id);
            return;
          }
          const child = firstChildRowIndex(rows, index);
          if (child !== -1) onFocusRow(rows[child].person.id);
          return;
        }
        case 'ArrowLeft': {
          event.preventDefault();
          if (row.hasChildren && row.isExpanded) {
            onToggleRow(row.person.id);
            return;
          }
          const parent = parentRowIndex(rows, index);
          if (parent !== -1) onFocusRow(rows[parent].person.id);
          return;
        }
        case 'Home': {
          if (rows.length === 0) return;
          event.preventDefault();
          onFocusRow(rows[0].person.id);
          return;
        }
        case 'End': {
          if (rows.length === 0) return;
          event.preventDefault();
          onFocusRow(rows[rows.length - 1].person.id);
          return;
        }
        case 'Enter':
        case ' ': {
          if (!row.hasChildren) return;
          event.preventDefault();
          onToggleRow(row.person.id);
          return;
        }
        default:
          return;
      }
    },
    [rows, tabbableId, onFocusRow, onToggleRow],
  );
}
