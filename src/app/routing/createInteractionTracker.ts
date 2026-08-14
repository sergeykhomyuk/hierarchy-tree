import type { ObservabilityFacade } from '@platform/observability';
import { NavigationState } from './navigationState';

export type RouterState = {
  navigation: { state: NavigationState };
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
    return router.subscribe((state) => {
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

  function shouldReportPrimitive(key: string): boolean {
    if (reportedPrimitives.has(key)) return false;
    reportedPrimitives.add(key);
    return true;
  }

  return {
    attach,
    currentCorrelationId: () => correlationId,
    beginInteraction: startInteraction,
    shouldReportPrimitive,
  };
}
