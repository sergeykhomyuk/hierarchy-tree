import { memo } from 'react';
import { sizeClass, SkeletonSize } from '@shared/ui';

// The failed-resolution avatar shape - deliberately NOT the kit Skeleton,
// whose animate-pulse would render a "still loading" circle forever in a
// state that has actually settled, and whose aria-hidden would remove
// the only avatar-position element from the accessibility tree once
// resolution fails (invariant 99). Same box as the resolved Avatar and
// the pending Skeleton (sizeClass.avatar), so no reflow crosses the
// boundary between presentations.
export const SignedInAvatarPlaceholder = memo(
  function SignedInAvatarPlaceholder() {
    return (
      <span
        aria-hidden="true"
        className={`${sizeClass[SkeletonSize.avatar]} rounded-full bg-surface-hover`}
      />
    );
  },
);
