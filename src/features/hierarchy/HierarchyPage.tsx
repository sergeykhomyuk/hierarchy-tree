import { memo, use, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { EmptyState, ErrorState } from '@shared/ui';
import { HierarchyResultKind } from './data/fetchPeople';
import type { HierarchyResult } from './data/fetchPeople';
import { defaultExpansion } from './domain/defaultExpansion';
import { HierarchySummary } from './HierarchySummary';
import { HierarchyTree } from './HierarchyTree';

const LOGIN_PATH = '/login';

export type HierarchyPageProps = {
  hierarchy: Promise<HierarchyResult>;
  onRetry: () => void;
  onRefresh: () => void;
  // A plain string|number, not auth's own UserIdentifier - see
  // HierarchyTree.tsx's own note on the same choice.
  userId?: string | number;
};

// Reads the loader promise with use() and switches on HierarchyResult.kind
// - no previous result is held or needed, since a superseded navigation
// never commits and cancelled reaches no render (invariant 57); the branch
// exists for totality. The caller wraps this in
// <Suspense fallback={<HierarchySkeleton />}>.
export const HierarchyPage = memo(function HierarchyPage({
  hierarchy,
  onRetry,
  onRefresh,
  userId,
}: HierarchyPageProps) {
  const { t } = useTranslation('hierarchy');
  const navigate = useNavigate();
  const handleBackToLogin = useCallback(() => {
    void navigate(LOGIN_PATH);
  }, [navigate]);
  const result = use(hierarchy);

  switch (result.kind) {
    case HierarchyResultKind.Cancelled:
      return null;
    case HierarchyResultKind.Failure:
      return (
        <ErrorState
          framed={false}
          glyph={
            <span
              aria-hidden="true"
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-danger-surface text-lg font-semibold text-danger"
            >
              !
            </span>
          }
          title={t('page.errorHeading')}
          message={t('page.errorBody')}
          correlationId={result.correlationId}
          action={{ label: t('page.retryLabel'), onActivate: onRetry }}
          secondaryAction={{
            label: t('page.backToLoginLabel'),
            onActivate: handleBackToLogin,
          }}
        />
      );
    case HierarchyResultKind.Empty:
      return (
        <EmptyState
          framed={false}
          glyph={
            <span
              aria-hidden="true"
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-border-hairline"
            />
          }
          title={t('page.emptyHeading')}
          message={t('page.emptyBody')}
          action={{ label: t('page.refreshLabel'), onActivate: onRefresh }}
        />
      );
    case HierarchyResultKind.Data:
      return (
        <div>
          <HierarchySummary counts={result.counts} />
          <HierarchyTree
            roots={result.roots}
            expandedIds={defaultExpansion(result.roots)}
            {...(userId !== undefined ? { signedInUserId: userId } : {})}
          />
        </div>
      );
  }
});
