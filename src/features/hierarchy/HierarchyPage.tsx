import { memo, use, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import type { ObservabilityFacade } from '@platform/observability';
import { EmptyState, ErrorState } from '@shared/ui';
import { HierarchyResultKind } from './data/fetchPeople';
import type { HierarchyResult } from './data/fetchPeople';
import { defaultExpansion } from './domain/defaultExpansion';
import type { PersonIdentifier } from './domain/personIdentifier';
import { HierarchySummary } from './HierarchySummary';
import { HierarchyTree } from './HierarchyTree';

const LOGIN_PATH = '/login';

export type HierarchyPageDependencies = {
  observability: ObservabilityFacade;
};

export type HierarchyPageProps = {
  hierarchy: Promise<HierarchyResult>;
  onRetry: () => void;
  onRefresh: () => void;
  // A plain string|number, not auth's own UserIdentifier - see
  // HierarchyTree.tsx's own note on the same choice.
  userId?: string | number;
  dependencies: HierarchyPageDependencies;
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
  dependencies,
}: HierarchyPageProps) {
  const { t } = useTranslation('hierarchy');
  const navigate = useNavigate();
  const handleBackToLogin = useCallback(() => {
    void navigate(LOGIN_PATH);
  }, [navigate]);
  const result = use(hierarchy);
  // Stands in for useExpansion (step 27) until it lands: a plain toggle
  // of the clicked id's membership, which is also what makes invariant
  // 110 true for free - collapsing a parent only removes the PARENT's
  // own id, never a descendant's, so a descendant's own expansion is
  // still in the set, untouched, the moment the parent is re-expanded.
  // use() runs first, so the initializer can read result directly rather
  // than needing an effect that would flash an empty tree for a frame.
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<PersonIdentifier>>(
    () =>
      result.kind === HierarchyResultKind.Data
        ? defaultExpansion(result.roots)
        : new Set(),
  );
  const toggleExpanded = useCallback((personId: PersonIdentifier) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(personId)) {
        next.delete(personId);
      } else {
        next.add(personId);
      }
      return next;
    });
  }, []);

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
            expandedIds={expandedIds}
            observability={dependencies.observability}
            onToggle={toggleExpanded}
            {...(userId !== undefined ? { signedInUserId: userId } : {})}
          />
        </div>
      );
  }
});
