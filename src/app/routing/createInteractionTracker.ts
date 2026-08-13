import type { ObservabilityFacade } from '@platform/observability';

export type NavigationState = 'idle' | 'loading' | 'submitting';

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
};

export function createInteractionTracker(
  observability: Pick<ObservabilityFacade, 'tracer' | 'analytics'>,
): InteractionTracker {
  let correlationId: string | null = null;
  let tracking = false;

  function startInteraction(): void {
    tracking = true;
    correlationId = observability.tracer.startInteraction();
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
      const isNavigating = state.navigation.state !== 'idle';
      if (isNavigating && !tracking) {
        startInteraction();
        return;
      }
      if (!isNavigating && tracking) {
        settle(state);
      }
    });
  }

  return {
    attach,
    currentCorrelationId: () => correlationId,
  };
}
