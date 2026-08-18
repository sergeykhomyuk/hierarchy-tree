import { useCallback, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import type { CancelTimer, Clock } from '@platform/runtime';
import {
  findRowIndexById,
  firstChildRowIndex,
  nextVisibleIndex,
  parentRowIndex,
  previousVisibleIndex,
  siblingRowIndices,
} from './domain/rowNavigation';
import { findTypeAheadMatch } from './domain/typeAheadMatch';
import type { VisibleRow } from './domain/flattenVisible';
import type { PersonIdentifier } from './domain/personIdentifier';

// Invariant 139.
const TYPE_AHEAD_RESET_DELAY_MILLISECONDS = 1000;

export type UseTreeKeyboardOptions = {
  rows: readonly VisibleRow[];
  // Parallel to rows, same order - the exact string each row's aria-label
  // carries (invariant 138: type-ahead "matches the same string a screen
  // reader announces").
  accessibleNames: readonly string[];
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
  // The asterisk key's one action (invariant 141) - called once with
  // every id that will actually open, never once per id. depth is the
  // focused row's own, which every sibling shares by definition.
  onExpandSiblings: (
    personIds: readonly PersonIdentifier[],
    depth: number,
  ) => void;
  clock: Clock;
  language: string;
};

export function useTreeKeyboard({
  rows,
  accessibleNames,
  tabbableId,
  onFocusRow,
  onToggleRow,
  onExpandSiblings,
  clock,
  language,
}: UseTreeKeyboardOptions) {
  // Internal bookkeeping only - never rendered, so refs rather than state
  // (invariant 139's buffer, and the timer that clears it after an idle
  // second, driven by the injected Clock rather than setTimeout, which
  // eslint.config.js bans across src with no feature override).
  const bufferRef = useRef('');
  const cancelResetRef = useRef<CancelTimer | null>(null);

  return useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (tabbableId === null) return;
      const index = findRowIndexById(rows, tabbableId);
      const row = rows[index];
      if (row === undefined) return;

      const focusIndex = (targetIndex: number) => {
        const target = rows[targetIndex];
        if (target !== undefined) onFocusRow(target.person.id);
      };

      switch (event.key) {
        case 'ArrowDown': {
          event.preventDefault();
          focusIndex(nextVisibleIndex(rows, index));
          return;
        }
        case 'ArrowUp': {
          event.preventDefault();
          focusIndex(previousVisibleIndex(rows, index));
          return;
        }
        case 'ArrowRight': {
          if (!row.hasChildren) return;
          event.preventDefault();
          if (!row.isExpanded) {
            onToggleRow(row.person.id);
            return;
          }
          focusIndex(firstChildRowIndex(rows, index));
          return;
        }
        case 'ArrowLeft': {
          event.preventDefault();
          if (row.hasChildren && row.isExpanded) {
            onToggleRow(row.person.id);
            return;
          }
          focusIndex(parentRowIndex(rows, index));
          return;
        }
        case 'Home': {
          if (rows.length === 0) return;
          event.preventDefault();
          focusIndex(0);
          return;
        }
        case 'End': {
          if (rows.length === 0) return;
          event.preventDefault();
          focusIndex(rows.length - 1);
          return;
        }
        case 'Enter':
        case ' ': {
          if (!row.hasChildren) return;
          event.preventDefault();
          onToggleRow(row.person.id);
          return;
        }
        case '*': {
          event.preventDefault();
          const idsToOpen = siblingRowIndices(rows, index)
            .map((siblingIndex) => rows[siblingIndex])
            .filter(
              (candidate): candidate is VisibleRow =>
                candidate !== undefined &&
                candidate.hasChildren &&
                !candidate.isExpanded,
            )
            .map((candidate) => candidate.person.id);
          if (idsToOpen.length > 0) onExpandSiblings(idsToOpen, row.depth);
          return;
        }
        default: {
          if (
            event.key.length !== 1 ||
            event.ctrlKey ||
            event.metaKey ||
            event.altKey
          ) {
            return;
          }
          event.preventDefault();
          cancelResetRef.current?.();
          bufferRef.current += event.key;
          cancelResetRef.current = clock.setTimer(
            TYPE_AHEAD_RESET_DELAY_MILLISECONDS,
            () => {
              bufferRef.current = '';
            },
          );
          const match = findTypeAheadMatch(
            accessibleNames,
            index,
            bufferRef.current,
            language,
          );
          if (match !== null) focusIndex(match);
          return;
        }
      }
    },
    [
      rows,
      accessibleNames,
      tabbableId,
      onFocusRow,
      onToggleRow,
      onExpandSiblings,
      clock,
      language,
    ],
  );
}
