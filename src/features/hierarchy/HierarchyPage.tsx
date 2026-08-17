import { memo, use } from 'react';
import { useTranslation } from 'react-i18next';
import { HierarchyResultKind } from './data/fetchPeople';
import type { HierarchyResult } from './data/fetchPeople';

export type HierarchyPageProps = {
  hierarchy: Promise<HierarchyResult>;
};

// Reads the loader promise with use() and switches on HierarchyResult.kind
// - no previous result is held or needed, since a superseded navigation
// never commits and cancelled reaches no render (invariant 57); the branch
// exists for totality. The caller wraps this in
// <Suspense fallback={<HierarchySkeleton />}>.
export const HierarchyPage = memo(function HierarchyPage({
  hierarchy,
}: HierarchyPageProps) {
  const { t } = useTranslation('hierarchy');
  const result = use(hierarchy);

  switch (result.kind) {
    case HierarchyResultKind.Cancelled:
      return null;
    case HierarchyResultKind.Failure:
      return null;
    case HierarchyResultKind.Empty:
      return null;
    case HierarchyResultKind.Data:
      return (
        <div>
          <p className="text-lg font-semibold text-ink">
            {t('page.cardTitle')}
          </p>
        </div>
      );
  }
});
