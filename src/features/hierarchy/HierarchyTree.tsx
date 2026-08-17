import { memo, useCallback, useEffect, useRef } from 'react';
import type { ObservabilityFacade } from '@platform/observability';
import { flattenVisible } from './domain/flattenVisible';
import type { PersonIdentifier } from './domain/personIdentifier';
import type { TreeNode } from './domain/treeNode';
import { ROW_LIST_MAX_HEIGHT_CLASS } from './rowListMaxHeightClass';
import { TreeRow } from './TreeRow';

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
  onToggle: (personId: PersonIdentifier) => void;
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
  onToggle,
}: HierarchyTreeProps) {
  const rows = flattenVisible(roots, expandedIds);

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

  return (
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
          onPhotoError={handlePhotoError}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
});
