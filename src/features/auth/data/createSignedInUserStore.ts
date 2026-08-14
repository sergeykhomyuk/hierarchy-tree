import type { HttpClient } from '@platform/http';
import type { ObservabilityFacade } from '@platform/observability';
import type { UserIdentifier } from '../domain/userIdentifier';
import { fetchSignedInUser } from './fetchSignedInUser';
import type { SignedInUserView } from './signedInUserView';

export type SignedInUserStore = {
  read(userId: UserIdentifier): Promise<SignedInUserView | null>;
};

export type SignedInUserStoreDependencies = {
  http: HttpClient;
  observability: ObservabilityFacade;
};

// Memoises by user id for the store's own lifetime - the page's, since it
// is built once in createRuntime (invariant 97b): a reload re-requests,
// the honest consequence the invariant names.
export function createSignedInUserStore(
  dependencies: SignedInUserStoreDependencies,
): SignedInUserStore {
  const { http, observability } = dependencies;
  const cache = new Map<UserIdentifier, Promise<SignedInUserView | null>>();

  return {
    read(userId: UserIdentifier): Promise<SignedInUserView | null> {
      const existing = cache.get(userId);
      if (existing) return existing;

      const pending = fetchSignedInUser(http, userId, observability);
      cache.set(userId, pending);
      return pending;
    },
  };
}
