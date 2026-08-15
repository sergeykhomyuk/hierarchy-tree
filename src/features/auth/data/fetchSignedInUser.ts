import type { HttpClient } from '@platform/http';
import type { ObservabilityFacade } from '@platform/observability';
import type { UserIdentifier } from '../domain/userIdentifier';
import { signedInUserSchema } from './signedInUserSchema';
import type { SignedInUserView } from './signedInUserView';
import { userResourcePath } from './userResourcePath';

// The store's promise must never reject (invariant 97c): every HttpResult
// arm besides success - network, timeout, an HTTP status, a malformed
// body, cancelled - maps to a resolved null with one warn-level record,
// rather than reaching the header's Suspense boundary as a rejection and
// producing the error page 97c forbids.
export async function fetchSignedInUser(
  http: HttpClient,
  userId: UserIdentifier,
  observability: ObservabilityFacade,
): Promise<SignedInUserView | null> {
  const result = await http.request({
    method: 'GET',
    resourcePath: userResourcePath(userId),
    parse: (payload) => signedInUserSchema.parse(payload),
  });

  if (result.outcome !== 'success') {
    const reason =
      result.outcome === 'cancelled' ? 'cancelled' : result.failure.kind;
    observability.logger.warn('auth.signed_in_user_unresolved', { reason });
    return null;
  }

  return {
    displayName: `${result.value.firstName} ${result.value.lastName}`,
  };
}
