import type { ObservabilityFacade } from '@platform/observability';
import { NavigationState } from './navigationState';
import { RevalidationState } from './revalidationState';

export type RouterState = {
  navigation: { state: NavigationState };
  revalidation: RevalidationState;
  matches: ReadonlyArray<{ route: { id: string } }>;
  errors?: Readonly<Record<string, unknown>> | null;
};

export type Router = {
  subscribe: (listener: (state: RouterState) => void) => () => void;
};

export type InteractionTracker = {
  attach: (router: Router) => () => void;
  currentCorrelationId: () => string | null;
  // A submission is an interaction but not a navigation, so the
  // router-driven tracker does not open one for it - the login form opens
  // its own via this, sharing the same private slot currentCorrelationId()
  // reads (so the id on the http client's timing record, the analytics
  // events and the correlation id rendered to the user are all literally
  // the same string).
  beginInteraction: () => string;
  // Closes an interaction beginInteraction() opened when it did not lead
  // to a navigation. Without this, `tracking` stays true forever, so the
  // *next* unrelated navigation's loading transition finds `tracking`
  // already set and skips minting its own id - reusing the abandoned
  // attempt's stale one for a request or error that has nothing to do
  // with it.
  endInteraction: () => void;
  // Primitive-throw dedup for reportRootError.ts (invariant 92): a WeakSet
  // covers object errors, but WeakSet.add rejects primitives outright, so
  // they need this string-keyed sibling instead. Scoped to the current
  // interaction rather than the tracker's whole lifetime, so a genuinely
  // repeated primitive throw in a LATER interaction is reported again.
  shouldReportPrimitive: (key: string) => boolean;
};

export function createInteractionTracker(
  observability: Pick<ObservabilityFacade, 'tracer' | 'analytics'>,
): InteractionTracker {
  let correlationId: string | null = null;
  let tracking = false;
  let reportedPrimitives = new Set<string>();

  function startInteraction(): string {
    tracking = true;
    correlationId = observability.tracer.startInteraction();
    reportedPrimitives = new Set();
    return correlationId;
  }

  function settle(state: RouterState): void {
    tracking = false;
    if (state.errors && Object.keys(state.errors).length > 0) {
      return;
    }
    const routeId = state.matches[state.matches.length - 1]?.route.id;
    if (routeId === undefined) return;
    observability.analytics.track('app.route_viewed', { routeId });
  }

  function attach(router: Router): () => void {
    startInteraction();
    let previousNavigationState: NavigationState = NavigationState.Idle;
    let previousRevalidationState: RevalidationState = RevalidationState.Idle;

    return router.subscribe((state) => {
      const navigationStateChanged =
        state.navigation.state !== previousNavigationState;
      const revalidationStateChanged =
        state.revalidation !== previousRevalidationState;
      previousNavigationState = state.navigation.state;
      previousRevalidationState = state.revalidation;

      // A revalidation (router.revalidate(), used by Retry/Refresh) never
      // moves navigation.state - only state.revalidation changes. Treating
      // that as a settle would spuriously close an interaction the caller
      // opened deliberately via beginInteraction() and emit a route_viewed
      // for a request that was never a navigation.
      if (!navigationStateChanged && revalidationStateChanged) {
        return;
      }

      const isNavigating = state.navigation.state !== NavigationState.Idle;
      if (isNavigating && !tracking) {
        startInteraction();
        return;
      }
      if (!isNavigating && tracking) {
        settle(state);
      }
    });
  }

  function endInteraction(): void {
    tracking = false;
  }

  function shouldReportPrimitive(key: string): boolean {
    if (reportedPrimitives.has(key)) return false;
    reportedPrimitives.add(key);
    return true;
  }

  return {
    attach,
    currentCorrelationId: () => correlationId,
    beginInteraction: startInteraction,
    endInteraction,
    shouldReportPrimitive,
  };
}
