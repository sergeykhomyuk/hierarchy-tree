import { memo, Suspense, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useLoaderData,
  useRevalidator,
  useRouteLoaderData,
} from 'react-router';
import { HierarchyPage, HierarchySkeleton } from '@features/hierarchy';
import { useDocumentTitle } from '@shared/hooks';
import type { HierarchyLoaderData } from '../createHierarchyLoader';
import type { AuthenticatedLoaderData } from '../../layout/createAuthenticatedLoader';
import { RevalidationState } from '../revalidationState';
import { useRuntime } from '../../composition';

// SerializeFrom<T> (react-router's useLoaderData<T>() return type) only
// resolves through a function type, not a plain data type -
// AuthenticatedLayout.tsx's own precedent.
type HierarchyRouteLoader = () => HierarchyLoaderData;
type AuthenticatedRouteLoader = () => AuthenticatedLoaderData;

export { loadTranslations } from '@features/hierarchy';

// The module that assembles HierarchyPage's dependencies rather than a
// bare re-export (TECH.md's decision log). Retry and Refresh both wrap
// the SAME beginInteraction -> revalidate() -> endInteraction() sequence
// - re-running the loader is all either one needs, so there is no second
// code path to keep in sync (invariant 70, 79).
export const HomeRoute = memo(function HomeRoute() {
  const runtime = useRuntime();
  const { t } = useTranslation('hierarchy');
  useDocumentTitle(t('page.documentTitle'));
  const { hierarchy } = useLoaderData<HierarchyRouteLoader>();
  const authenticatedData =
    useRouteLoaderData<AuthenticatedRouteLoader>('authenticated');
  const revalidator = useRevalidator();

  // beginInteraction() -> revalidate() -> endInteraction(), literally in
  // sequence: the loader reads currentCorrelationId() as part of running
  // revalidate(), so the freshly minted id is already in place by the time
  // it does, and closing the interaction right after no longer needs it
  // held open (invariant 70, 79).
  const handleReload = useCallback(() => {
    runtime.interactionTracker.beginInteraction();
    void revalidator.revalidate();
    runtime.interactionTracker.endInteraction();
  }, [runtime.interactionTracker, revalidator]);

  // Defensive backstop for the same guarantee: if a revalidation is ever
  // still in flight when this route unmounts - a navigation started mid-
  // retry - the interaction is closed here too, so that navigation mints
  // its own correlation id instead of inheriting the retry's rather than
  // depending on revalidator.state settling first (invariant 193).
  useEffect(() => {
    if (revalidator.state !== RevalidationState.Loading) return undefined;
    return () => {
      runtime.interactionTracker.endInteraction();
    };
  }, [revalidator.state, runtime.interactionTracker]);

  // Stable across re-renders so it does not defeat HierarchyPage's own
  // memo comparison every time HomeRoute re-renders for an unrelated
  // reason.
  const dependencies = useMemo(
    () => ({ observability: runtime.observability, clock: runtime.clock }),
    [runtime.observability, runtime.clock],
  );

  return (
    // The single card frame every one of the four states renders inside
    // (ErrorState/EmptyState's own framed={false} exists for exactly this
    // - the page supplies ONE frame, not each state its own). Outside the
    // Suspense boundary so the same DOM node persists across the loading-
    // to-data transition rather than two differently-styled elements that
    // merely happen to match (invariant 64).
    <div
      data-testid="hierarchy-card-frame"
      className="h-[calc(100vh-100px)] overflow-hidden rounded-card border border-border-hairline bg-surface shadow-sm"
    >
      <Suspense fallback={<HierarchySkeleton />}>
        <HierarchyPage
          hierarchy={hierarchy}
          onRetry={handleReload}
          onRefresh={handleReload}
          dependencies={dependencies}
          {...(authenticatedData?.userId !== undefined
            ? { userId: authenticatedData.userId }
            : {})}
        />
      </Suspense>
    </div>
  );
});
