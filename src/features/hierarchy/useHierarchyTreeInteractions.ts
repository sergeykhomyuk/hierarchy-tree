import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { ObservabilityFacade } from '@platform/observability';
import type { Clock } from '@platform/runtime';
import {
  personDisplayName,
  recoverFocusedRowId,
  type PersonIdentifier,
  type VisibleRow,
} from './domain';
import { HIERARCHY_TRANSLATION_NAMESPACE } from './translationNamespace';
import { useTreeKeyboard } from './useTreeKeyboard';

type UseHierarchyTreeInteractionsOptions = {
  rows: readonly VisibleRow[];
  accessibleNames: readonly string[];
  expandedIds: ReadonlySet<PersonIdentifier>;
  observability: ObservabilityFacade;
  clock: Clock;
  onToggle: (personId: PersonIdentifier) => void;
  onExpandMany: (personIds: readonly PersonIdentifier[]) => void;
};

type HierarchyTreeInteractions = {
  readonly announcement: string;
  readonly tabbableId: PersonIdentifier | null;
  readonly handleRowFocus: (personId: PersonIdentifier) => void;
  readonly handleRowToggle: (personId: PersonIdentifier) => void;
  readonly handleKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  readonly registerRowElement: (
    personId: PersonIdentifier,
    element: HTMLDivElement | null,
  ) => void;
};

export function useHierarchyTreeInteractions({
  rows,
  accessibleNames,
  expandedIds,
  observability,
  clock,
  onToggle,
  onExpandMany,
}: UseHierarchyTreeInteractionsOptions): HierarchyTreeInteractions {
  const { t, i18n } = useTranslation(HIERARCHY_TRANSLATION_NAMESPACE);

  // rows changes on every genuine expansion update, so a ref rather than a
  // dependency keeps handleRowToggle's own identity stable across toggles -
  // otherwise every row's memo would bail out on nothing, since a new
  // onToggle prop would look like a change on every single one (invariant 91).
  const rowsRef = useRef(rows);
  const [announcement, setAnnouncement] = useState('');

  // Roving tabindex (invariants 130-132): one row is the tab stop, kept in
  // React state rather than read straight off the DOM so a render can decide
  // every row's tabIndex in one pass.
  const [tabbableId, setTabbableId] = useState<PersonIdentifier | null>(
    () => rows[0]?.person.id ?? null,
  );
  const tabbableIdRef = useRef(tabbableId);

  // Custom hooks synchronize their latest render values through an effect so
  // the stable callbacks below can read them without turning those values into
  // callback dependencies and defeating TreeRow's memo bailout.
  useEffect(() => {
    rowsRef.current = rows;
    tabbableIdRef.current = tabbableId;
  });

  // Element refs, keyed by person id, so arrow/Home/End movement and focus
  // recovery can call .focus() directly. A native focus event is what updates
  // the roving tab stop through handleRowFocus for every movement path.
  const rowElementsRef = useRef(new Map<PersonIdentifier, HTMLDivElement>());
  const registerRowElement = useCallback(
    (personId: PersonIdentifier, element: HTMLDivElement | null) => {
      if (element === null) {
        rowElementsRef.current.delete(personId);
      } else {
        rowElementsRef.current.set(personId, element);
      }
    },
    [],
  );
  const focusRow = useCallback((personId: PersonIdentifier) => {
    rowElementsRef.current.get(personId)?.focus();
  }, []);

  const previousRowsForFocusRef = useRef(rows);
  useEffect(() => {
    const previousRows = previousRowsForFocusRef.current;
    const currentRows = rowsRef.current;
    previousRowsForFocusRef.current = currentRows;
    const current = tabbableIdRef.current;
    const recovered =
      current === null
        ? (currentRows[0]?.person.id ?? null)
        : recoverFocusedRowId(previousRows, currentRows, current);
    if (recovered === current) return;
    setTabbableId(recovered);
    // Only a genuine recovery - the previously-tabbable row is actually gone
    // - moves real DOM focus. Collapsing a branch that contains the focused row
    // and a Back/Forward that removes it both land here; an ordinary toggle
    // elsewhere in the tree does not (invariants 143-144).
    if (recovered !== null) focusRow(recovered);
  }, [expandedIds, focusRow]);

  const handleRowFocus = useCallback((personId: PersonIdentifier) => {
    setTabbableId(personId);
  }, []);

  const handleRowToggle = useCallback(
    (personId: PersonIdentifier) => {
      const row = rowsRef.current.find(
        (candidate) => candidate.person.id === personId,
      );
      if (row !== undefined) {
        const willBeExpanded = !row.isExpanded;
        // Depth and the new state only - no name, email or person id
        // (invariant 115).
        observability.analytics.track('hierarchy.toggled', {
          expanded: willBeExpanded,
          depth: row.depth,
        });
        setAnnouncement(
          t(
            willBeExpanded
              ? 'page.toggleAnnouncedExpanded'
              : 'page.toggleAnnouncedCollapsed',
            { name: personDisplayName(row.person) },
          ),
        );
      }
      onToggle(personId);
    },
    [onToggle, observability, t],
  );

  const handleExpandSiblings = useCallback(
    (personIds: readonly PersonIdentifier[], depth: number) => {
      // Count and depth only - the same privacy rule as a single toggle
      // (invariant 115), extended to this event (invariant 141).
      observability.analytics.track('hierarchy.siblings_expanded', {
        count: personIds.length,
        depth,
      });
      setAnnouncement(
        t('page.siblingsExpandedAnnounced', { count: personIds.length }),
      );
      onExpandMany(personIds);
    },
    [onExpandMany, observability, t],
  );

  const handleKeyDown = useTreeKeyboard({
    rows,
    accessibleNames,
    tabbableId,
    onFocusRow: focusRow,
    onToggleRow: handleRowToggle,
    onExpandSiblings: handleExpandSiblings,
    clock,
    language: i18n.language,
  });

  return {
    announcement,
    tabbableId,
    handleRowFocus,
    handleRowToggle,
    handleKeyDown,
    registerRowElement,
  };
}
