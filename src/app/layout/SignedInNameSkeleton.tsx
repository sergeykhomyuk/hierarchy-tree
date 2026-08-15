import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Skeleton, SkeletonSize } from '@shared/ui';

// aria-busy plus a label rather than a separate visible/hidden text node -
// assistive technology hears "busy: loading your name" while pending and
// drops both once Suspense swaps this out for the settled presentation,
// which is what makes aria-busy present only while pending (invariant 99).
export const SignedInNameSkeleton = memo(function SignedInNameSkeleton() {
  const { t } = useTranslation();
  return (
    <span
      aria-busy="true"
      aria-label={t('header.nameLoading')}
      className="flex items-center gap-2"
    >
      <Skeleton
        shape="circle"
        width={SkeletonSize.avatar}
        height={SkeletonSize.avatar}
      />
      <Skeleton
        shape="text"
        width={SkeletonSize.line}
        height={SkeletonSize.line}
      />
    </span>
  );
});
