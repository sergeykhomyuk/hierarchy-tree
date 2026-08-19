import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { ObservabilityFacade } from '@platform/observability';
import type { Clock } from '@platform/runtime';
import { flattenVisible } from './domain/flattenVisible';
import { personDisplayName } from './domain/personDisplayName';
import { rowAccessibleName } from './domain/rowAccessibleName';
import type { PersonIdentifier } from './domain/personIdentifier';
import type { TreeNode } from './domain/treeNode';
import { ROW_LIST_MAX_HEIGHT_CLASS } from './rowListMaxHeightClass';
import { HIERARCHY_TRANSLATION_NAMESPACE } from './translationNamespace';
import { TreeAnnouncer } from './TreeAnnouncer';
import { TreeRow } from './TreeRow';
import { useHierarchyTreeInteractions } from './useHierarchyTreeInteractions';

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
  const { t } = useTranslation(HIERARCHY_TRANSLATION_NAMESPACE);
  const rows = useMemo(
    () => flattenVisible(roots, expandedIds),
    [roots, expandedIds],
  );
  const youMarkerLabel = t('page.youMarkerLabel');
  // Parallel to rows, in the same order - the exact string each row's
  // aria-label carries, so type-ahead matches "the same string a screen
  // reader announces" (invariant 138) rather than a second, independently
  // computed name that could drift from TreeRow's own.
  const accessibleNames = useMemo(
    () =>
      rows.map((row) =>
        rowAccessibleName(
          personDisplayName(row.person),
          row.person.id === signedInUserId,
          youMarkerLabel,
        ),
      ),
    [rows, signedInUserId, youMarkerLabel],
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

  const {
    announcement,
    tabbableId,
    handleRowFocus,
    handleRowToggle,
    handleKeyDown,
    registerRowElement,
  } = useHierarchyTreeInteractions({
    rows,
    accessibleNames,
    expandedIds,
    observability,
    clock,
    onToggle,
    onExpandMany,
  });

  return (
    <>
      <TreeAnnouncer message={announcement} />
      <div
        role="tree"
        aria-label={t('page.treeLabel')}
        className={ROW_LIST_MAX_HEIGHT_CLASS}
      >
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
            photoResetToken={roots}
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
