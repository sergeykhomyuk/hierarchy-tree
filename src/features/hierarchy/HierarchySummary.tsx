import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ForestSummaryCounts } from './domain/buildForest';

export type HierarchySummaryProps = {
  counts: ForestSummaryCounts;
};

// The title on one side and the summary line on the other (invariant 81).
// counts comes straight from HierarchyResult.Data.counts - the forest's
// own summary, computed once after validation and duplicate-id drops
// (invariant 82) - never derived here from the visible rows, which is
// what keeps it unchanged by a toggle (invariant 83).
export const HierarchySummary = memo(function HierarchySummary({
  counts,
}: HierarchySummaryProps) {
  const { t } = useTranslation('hierarchy');

  return (
    <div className="flex items-center justify-between border-b border-border-hairline pb-4">
      <h1 className="text-lg font-semibold text-ink">{t('page.cardTitle')}</h1>
      <p className="text-ink-muted">
        {counts.people} {t('page.summaryPeopleLabel')}
        {' · '}
        {counts.managers} {t('page.summaryManagersLabel')}
        {' · '}
        {counts.roots} {t('page.summaryRootsLabel')}
      </p>
    </div>
  );
});
