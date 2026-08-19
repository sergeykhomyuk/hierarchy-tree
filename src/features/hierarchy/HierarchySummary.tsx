import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCount } from '@shared/utils';
import type { ForestSummaryCounts } from './domain';
import { HIERARCHY_TRANSLATION_NAMESPACE } from './translationNamespace';

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
  const { t, i18n } = useTranslation(HIERARCHY_TRANSLATION_NAMESPACE);

  return (
    <div className="flex h-[46px] items-center justify-between border-b border-border-hairline px-[18px]">
      <h1 className="text-sm font-semibold text-ink">{t('page.cardTitle')}</h1>
      <p className="text-sm text-ink-muted">
        {t('page.summary', {
          people: formatCount(counts.people, i18n.language),
          managers: formatCount(counts.managers, i18n.language),
          roots: formatCount(counts.roots, i18n.language),
        })}
      </p>
    </div>
  );
});
