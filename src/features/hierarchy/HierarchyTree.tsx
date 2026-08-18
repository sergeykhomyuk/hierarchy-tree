import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ObservabilityFacade } from '@platform/observability';
import type { Clock } from '@platform/runtime';
import { flattenVisible } from './domain/flattenVisible';
import { personDisplayName } from './domain/personDisplayName';
import { recoverFocusedRowId } from './domain/recoverFocusedRowId';
import { rowAccessibleName } from './domain/rowAccessibleName';
import type { PersonIdentifier } from './domain/personIdentifier';
import type { TreeNode } from './domain/treeNode';
import { ROW_LIST_MAX_HEIGHT_CLASS } from './rowListMaxHeightClass';
import { TreeAnnouncer } from './TreeAnnouncer';
import { TreeRow } from './TreeRow';
import { useTreeKeyboard } from './useTreeKeyboard';

export type HierarchyTreeProps = {
  roots: readonly TreeNode[];
  expandedIds: ReadonlySet<PersonIdentifier>;
  // A plain string|number rather than auth's own UserIdentifier - this
  // feature never imports another feature (no cross-feature imports),
  // so the caller (HomeRoute, the app layer) hands over the raw
  // identifier and this file stays ignorant of what produced it. A
  // string that names no person id matches no row, which is the same
  // no-match behavior as an id belonging to nobody, not an error
  // (invariant 85).
  signedInUserId?: string | number;
  observability: ObservabilityFacade;
  // The type-ahead reset timer (invariant 139) - injected rather than
  // setTimeout, which eslint.config.js bans across src with no feature
  // override.
  clock: Clock;
  onToggle: (personId: PersonIdentifier) => void;
  // The asterisk key's one action (invariant 141) - a single call opening
  // every id at once, distinct from onToggle's one-id-at-a-time path.
  onExpandMany: (personIds: readonly PersonIdentifier[]) => void;
};

// The tree renders every visible row from the row model, in its order,
// and nothing else (invariant 89) - flattenVisible is the single source
// of what's visible, so there is no second traversal here to drift out
// of sync with it.
export const HierarchyTree = memo(function HierarchyTree({
  roots,
  expandedIds,
  signedInUserId,
  observability,
  clock,
  onToggle,
  onExpandMany,
}: HierarchyTreeProps) {
  const { t, i18n } = useTranslation('hierarchy');
  const rows = flattenVisible(roots, expandedIds);
  const youMarkerLabel = t('page.youMarkerLabel');
  // Parallel to rows, in the same order - the exact string each row's
  // aria-label carries, so type-ahead matches "the same string a screen
  // reader announces" (invariant 138) rather than a second, independently
  // computed name that could drift from TreeRow's own.
  const accessibleNames = rows.map((row) =>
    rowAccessibleName(
      personDisplayName(row.person),
      row.person.id === signedInUserId,
      youMarkerLabel,
    ),
  );

  // Held here rather than by a row: collapsing and re-expanding a branch
  // remounts its rows, and a fresh mount must not produce a second report
  // for a person already reported this load (invariant 97). roots is a
  // freshly built structure every time a new payload resolves - buildForest
  // never reuses the previous call's objects - so resetting on its
  // identity is exactly "resets when a new payload resolves", without this
  // component needing the raw loader promise to know that happened.
  const reportedPhotoFailures = useRef<Set<PersonIdentifier>>(new Set());
  useEffect(() => {
    reportedPhotoFailures.current = new Set();
  }, [roots]);

  const handlePhotoError = useCallback(
    (personId: PersonIdentifier) => {
      if (reportedPhotoFailures.current.has(personId)) return;
      reportedPhotoFailures.current.add(personId);
      // personId only - never the photo URL, a third-party address tied
      // to a named person (invariant 166).
      observability.logger.warn('hierarchy.photo_failed', { personId });
    },
    [observability],
  );

  // rows is a fresh array every render (flattenVisible never reuses the
  // previous call's objects), so a ref rather than a dependency keeps
  // handleRowToggle's own identity stable across toggles - otherwise every
  // row's memo would bail out on nothing, since a new onToggle prop would
  // look like a change on every single one (invariant 91).
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const [announcement, setAnnouncement] = useState('');

  // Roving tabindex (invariants 130-132): one row is the tab stop, kept in
  // React state rather than read straight off the DOM so a render can
  // decide every row's tabIndex in one pass. Recovery runs only when
  // expandedIds actually changes identity (a toggle or a Back/Forward),
  // never on a render caused by something unrelated - rows is read via a
  // ref precisely so it is not a dependency itself, since flattenVisible
  // never reuses the previous call's array (the same reasoning as
  // rowsRef above).
  const [tabbableId, setTabbableId] = useState<PersonIdentifier | null>(
    () => rows[0]?.person.id ?? null,
  );
  const previousRowsForFocusRef = useRef(rows);
  useEffect(() => {
    const previousRows = previousRowsForFocusRef.current;
    const currentRows = rowsRef.current;
    previousRowsForFocusRef.current = currentRows;
    setTabbableId((current) =>
      current === null
        ? (currentRows[0]?.person.id ?? null)
        : recoverFocusedRowId(previousRows, currentRows, current),
    );
  }, [expandedIds]);
  const handleRowFocus = useCallback((personId: PersonIdentifier) => {
    setTabbableId(personId);
  }, []);

  // Element refs, keyed by person id, so arrow/Home/End movement can call
  // .focus() directly - a native focus event is what actually moves the
  // roving tab stop (via TreeRow's own onFocus -> handleRowFocus), so
  // this hook never sets tabbableId itself.
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

  const handleRowToggle = useCallback(
    (personId: PersonIdentifier) => {
      const row = rowsRef.current.find(
        (candidate) => candidate.person.id === personId,
      );
      if (row !== undefined) {
        const willBeExpanded = !row.isExpanded;
        // Depth and the new state only - no name, no email, no person id
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

  return (
    <>
      <TreeAnnouncer message={announcement} />
      <div role="tree" className={ROW_LIST_MAX_HEIGHT_CLASS}>
        {rows.map((row) => (
          <TreeRow
            key={row.person.id}
            personId={row.person.id}
            firstName={row.person.firstName}
            lastName={row.person.lastName}
            email={row.person.email}
            {...(row.person.photo !== undefined
              ? { photo: row.person.photo }
              : {})}
            depth={row.depth}
            isExpanded={row.isExpanded}
            hasChildren={row.hasChildren}
            reportCount={row.reportCount}
            setSize={row.setSize}
            posInSet={row.posInSet}
            isSignedInUser={row.person.id === signedInUserId}
            isTabbable={row.person.id === tabbableId}
            onPhotoError={handlePhotoError}
            onToggle={handleRowToggle}
            onRowFocus={handleRowFocus}
            onKeyDown={handleKeyDown}
            registerElement={registerRowElement}
          />
        ))}
      </div>
    </>
  );
});
