import { memo } from 'react';
import { flattenVisible } from './domain/flattenVisible';
import type { PersonIdentifier } from './domain/personIdentifier';
import type { TreeNode } from './domain/treeNode';
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
};

// The tree renders every visible row from the row model, in its order,
// and nothing else (invariant 89) - flattenVisible is the single source
// of what's visible, so there is no second traversal here to drift out
// of sync with it.
export const HierarchyTree = memo(function HierarchyTree({
  roots,
  expandedIds,
  signedInUserId,
}: HierarchyTreeProps) {
  const rows = flattenVisible(roots, expandedIds);

  return (
    <div role="tree">
      {rows.map((row) => (
        <TreeRow
          key={row.person.id}
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
        />
      ))}
    </div>
  );
});
