import type { HttpClient } from '@platform/http';
import type { ObservabilityFacade } from '@platform/observability';
import type { UserIdentifier } from '../domain/userIdentifier';
import { parseSignedInUsers } from './parseSignedInUsers';
import type { SignedInUserView } from './signedInUserView';
import { USERS_COLLECTION_RESOURCE_PATH } from './usersCollectionResourcePath';

// The store's promise must never reject (invariant 97c): every HttpResult
// arm besides success - network, timeout, an HTTP status, a malformed
// body, cancelled - maps to a resolved null with one warn-level record,
// rather than reaching the header's Suspense boundary as a rejection and
// producing the error page 97c forbids. A resolved collection with no
// matching id is the same outcome for the same reason (97c's "a record
// that does not exist" case) - it is reported the same way, not thrown.
export async function fetchSignedInUser(
  http: HttpClient,
  userId: UserIdentifier,
  observability: ObservabilityFacade,
): Promise<SignedInUserView | null> {
  const result = await http.request({
    method: 'GET',
    resourcePath: USERS_COLLECTION_RESOURCE_PATH,
    parse: (payload) => parseSignedInUsers(payload),
  });

  if (result.outcome !== 'success') {
    const reason =
      result.outcome === 'cancelled' ? 'cancelled' : result.failure.kind;
    observability.logger.warn('auth.signed_in_user_unresolved', { reason });
    return null;
  }

  const record = result.value.find(
    (candidate) => String(candidate.id) === String(userId),
  );
  if (record === undefined) {
    observability.logger.warn('auth.signed_in_user_unresolved', {
      reason: 'not_found',
    });
    return null;
  }

  return {
    displayName: `${record.firstName} ${record.lastName}`,
  };
}
