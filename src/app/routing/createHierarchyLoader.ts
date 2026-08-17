import type { LoaderFunctionArgs } from 'react-router';
import { fetchPeople } from '@features/hierarchy';
import type { HierarchyResult } from '@features/hierarchy';
import type { HttpClient } from '@platform/http';
import { createCorrelationId } from '@platform/observability';
import type { ObservabilityFacade } from '@platform/observability';
import type { Randomness } from '@platform/runtime';
import type { InteractionTracker } from './createInteractionTracker';

export type HierarchyLoaderDependencies = {
  http: HttpClient;
  observability: ObservabilityFacade;
  interactionTracker: InteractionTracker;
  randomness: Randomness;
};

export type HierarchyLoaderData = {
  hierarchy: Promise<HierarchyResult>;
};

// Returns an OBJECT HOLDING the promise, never the bare promise -
// createAuthenticatedLoader.ts's own precedent, for the same reason: react-
// router awaits a bare returned promise before the route renders, which
// would block the navigation until the users request settles.
export function createHierarchyLoader(
  dependencies: HierarchyLoaderDependencies,
): (args: LoaderFunctionArgs) => HierarchyLoaderData {
  return function hierarchyLoader({
    request,
  }: LoaderFunctionArgs): HierarchyLoaderData {
    // The router's own attach() starts tracking before any navigation, so
    // this is null only in the pathological case where the loader runs
    // with no tracked interaction at all - mirrored from createRuntime.ts's
    // own http-client correlation id fallback.
    const correlationId =
      dependencies.interactionTracker.currentCorrelationId() ??
      createCorrelationId(dependencies.randomness);

    return {
      hierarchy: fetchPeople(
        dependencies.http,
        correlationId,
        dependencies.observability,
        request.signal,
      ),
    };
  };
}
