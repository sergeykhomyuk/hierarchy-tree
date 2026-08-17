import { requireSession } from '@features/auth';
import type { SignedInUserStore, SignedInUserView } from '@features/auth';
import type { LoaderFunctionArgs } from 'react-router';
import type { ObservabilityFacade } from '@platform/observability';
import type { KeyValueStorage } from '@platform/runtime';

export type AuthenticatedLoaderDependencies = {
  tabStorage: KeyValueStorage;
  observability: ObservabilityFacade;
  signedInUserStore: SignedInUserStore;
};

export type AuthenticatedLoaderData = {
  signedInUser: Promise<SignedInUserView | null>;
  userId: ReturnType<typeof requireSession>['userId'];
};

// Returns an OBJECT HOLDING the promise, never the bare promise: react-
// router awaits a bare returned promise before the route renders, which
// would block the navigation until the user record arrives, show no
// Suspense fallback, and violate "the header never blocks the page
// beneath it" in the strongest possible way - the page would not render
// at all (invariant 100). The promise this returns is what M4's header -
// rendered by AuthenticatedLayout - reads through use().
export function createAuthenticatedLoader(
  dependencies: AuthenticatedLoaderDependencies,
): (args: LoaderFunctionArgs) => AuthenticatedLoaderData {
  return function authenticatedLoader({
    request,
  }: LoaderFunctionArgs): AuthenticatedLoaderData {
    const { userId } = requireSession({
      request,
      tabStorage: dependencies.tabStorage,
      observability: dependencies.observability,
    });
    return {
      signedInUser: dependencies.signedInUserStore.read(userId),
      userId,
    };
  };
}
