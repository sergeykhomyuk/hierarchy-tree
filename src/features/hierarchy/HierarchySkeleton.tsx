import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Skeleton, SkeletonSize } from '@shared/ui';
import { ROW_LIST_MAX_HEIGHT_CLASS } from './rowListMaxHeightClass';

// Shaped like tree rows at varying indents (invariant 59), decorative in
// full: no rows, no tree role, no interactive element and no text in the
// placeholder shapes reach assistive technology (invariant 60). Only the
// title-row status announces anything, and it announces once (invariant
// 61) via role="status"'s implicit aria-live="polite" - the same
// technique SignedInNameSkeleton.tsx uses for the header's own skeleton.
const SKELETON_ROW_INDENT_CLASS = [
  'ps-0',
  'ps-8',
  'ps-16',
  'ps-16',
  'ps-8',
  'ps-0',
];

export const HierarchySkeleton = memo(function HierarchySkeleton() {
  const { t } = useTranslation('hierarchy');

  return (
    <div>
      <div className="flex items-center justify-between border-b border-border-hairline pb-4">
        <h1 className="text-lg font-semibold text-ink">
          {t('page.cardTitle')}
        </h1>
        <span
          role="status"
          aria-busy="true"
          aria-label={t('page.loadingLabel')}
          className="flex items-center gap-2 text-ink-muted"
        >
          {/* Button.tsx's own busy-spinner technique (aria-hidden, spun
              border ring), reused here rather than Skeleton, which is a
              pulsing placeholder shape - a different visual concept from
              a spinner. */}
          <span
            aria-hidden="true"
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
          <span>{t('page.loadingLabel')}</span>
        </span>
      </div>
      <div aria-hidden="true" className={ROW_LIST_MAX_HEIGHT_CLASS}>
        {SKELETON_ROW_INDENT_CLASS.map((indentClass, index) => (
          <div
            key={index}
            className={`flex items-center gap-3 py-3 ${indentClass}`}
          >
            <Skeleton
              shape="circle"
              width={SkeletonSize.avatar}
              height={SkeletonSize.avatar}
            />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton
                shape="text"
                width={SkeletonSize.line}
                height={SkeletonSize.line}
              />
              <Skeleton
                shape="text"
                width={SkeletonSize.line}
                height={SkeletonSize.line}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
